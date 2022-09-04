const puppeteer = require('puppeteer');
const fs = require('fs').promises;
require('dotenv').config();

(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: {
            width: 1000,
            height: 720
        }
    });
    const page = (await browser.pages())[0];
    await loadCookie(page);
    setInterval(async () => await saveCookie(page), 10000);

    if(process.env.LINKEDIN_MAIL && process.env.LINKEDIN_PASSWORD) {
        await authentification(
            page, 
            process.env.LINKEDIN_MAIL,
            process.env.LINKEDIN_PASSWORD
        )
        .then(() => waitNewMessages(page))
        .catch(e => {
            console.log(e);
            browser.close();
        });
    } else {
        console.log('Please set LINKEDIN_MAIL and LINKEDIN_PASSWORD environment variables');
        browser.close();
    }
})();


/**
 * Login to linkedin with mail and password or with cookies
 * @param {Page} page 
 * @param {string} mail 
 * @param {string} password 
 * @returns {Promise}
 */
async function authentification(page, mail, password) {
    return new Promise(async (resolve, reject) => {
        await page.goto('https://www.linkedin.com/');
        
        // Test if already logged
        try {
            await page.waitForSelector('input[name="session_key"]', { timeout: 5000 });
            const response = await page.evaluate((mail, password) => {
                return new Promise(async (resolve) => {
                    document.querySelector('input[name="session_key"]').value = mail;
                    document.querySelector('input[name="session_password"]').value = password;
                    document.querySelector('button[type="submit"]').click();
                    if(document.querySelector('.alert-content')) {
                        const errorMessage = document.querySelector('.alert-content').innerText.trim();
                        resolve(errorMessage || true);
                    } else {
                        resolve(true);
                    }
                });
            }, mail, password);
    
            if(response !== true) {
                reject(response);
                return;
            }
        } catch(e) {}        

        try {
            await page.waitForSelector('a.global-nav__primary-link[href*="messaging"]', { timeout: 5000 });
            await page.evaluate(() => document.querySelector('a.global-nav__primary-link[href*="messaging"]').click());
            await page.waitForSelector('.msg-conversation-listitem');
            resolve();
        } catch(e) {
            page.waitForSelector('#captcha-internal', { timeout: 5000 })
            .then(() => {
                if(!!process.env.HEADLESS) {
                    console.log('Captcha detected, resolve it and wait');
                    setTimeout(async () => {
                        await page.waitForSelector('a.global-nav__primary-link[href*="messaging"]', { timeout: 5000 });
                        await page.evaluate(() => document.querySelector('a.global-nav__primary-link[href*="messaging"]').click());
                        await page.waitForSelector('.msg-conversation-listitem');
                        resolve();
                    }, 10000);
                } else {
                    reject('Captcha detected, restart with npm run dev and resolve it');
                }
            })
            .catch(() => {
                reject('Authentification failed');
            });
        }
    });
}

/**
 * Detect new messages and send to answerMessage
 * @param {Page} page 
 */
async function waitNewMessages(page) {    
    let newMessageReceivedTimeout = Date.now();
    let inTyping = false;

    console.log('Waiting for new messages...');

    page.evaluate(() => {
        document.querySelector('.msg-conversations-container__conversations-list').addEventListener('DOMSubtreeModified', () => domUpdated('true'));
    });

    page.on('request', (request) => {
        if(request.url().match(/voyagerMessagingDashMessageDelivery/)) {
            setTimeout(async () => {
                if(Date.now() - newMessageReceivedTimeout > 1500 && !inTyping) {
                    refreshMessages(page);
                } else {
                    testMessage(page);
                }
            }, 1000);
        }
    });

    page.exposeFunction('domUpdated', async () => newMessageReceivedTimeout = Date.now());
    
    page.exposeFunction('refreshEnded', async () => testMessage(page));

    page.exposeFunction('newMessageReceived', async(name, message, isFirstMessage) => {
        if(inTyping) return;
        inTyping = true;

        console.log(name, message, isFirstMessage);

        const response = await formatAnswer(name, message, isFirstMessage);
        if(response) {
            await answerMessage(page, response);
            inTyping = false;
        }
    });

    function testMessage(page) {
        page.evaluate(() => {
            document.querySelectorAll('section.msg__list .msg-conversation-listitem a')[0].click();
            setTimeout(() => {
                try {
                    let nbProfils = document.querySelectorAll('.msg-s-message-list-content .msg-s-event-listitem__link').length;
                    let lastProfil = document.querySelectorAll('.msg-s-message-list-content .msg-s-event-listitem__link')[nbProfils - 1];
        
                    let nbMessages = document.querySelectorAll('.msg-s-event-listitem__message-bubble').length;
                    let lastMessage = document.querySelectorAll('.msg-s-event-listitem__message-bubble')[nbMessages - 1];
        
                    // If last message is minimum 6 caracters and if is not from me
                    if (lastMessage.innerText.length > 10 && lastProfil.href === document.querySelector('.msg-thread__link-to-profile').href) {
                        newMessageReceived(
                            lastProfil.querySelector('img').title,
                            lastMessage.innerText,
                            nbProfils <= 2
                        );
                    }
                } catch(e) {}
            }, 300);
        });
    }
}

/**
 * Force refresh messages list because their page is buggy
 * @param {Page} page 
 */
function refreshMessages(page) {
    page.evaluate(() => {
        if(document.querySelector('.msg-overlay-list-bubble--is-minimized')) {
            document.querySelector('.msg-overlay-bubble-header__details').click();
        }
        setTimeout(() => {
            document.querySelector('.msg-overlay-bubble-header__controls button').click();
            setTimeout(() => {
                document.querySelectorAll('.artdeco-dropdown__item')[2].click();
                setTimeout(() => {
                    document.querySelector('.msg-message-request-list-header-presenter__back-button').click();
                    setTimeout(() => refreshEnded(), 1000);
                }, 500);
            }, 500);
        }, 500);
    });
}

/**
 * Create promise to wait miliseconds
 * @param {number} ms 
 * @returns {Promise}
 */
async function waitForDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Write the answer
 * @param {Page} page 
 * @param {string} message 
 */
async function answerMessage(page, message) {
    return new Promise(async (resolve) => {
        await page.evaluate(() => document.querySelectorAll('section.msg__list .msg-conversation-listitem a')[0].click());
        await waitForDelay(500);
        try {
            await page.click('.msg-form__contenteditable');
            await page.keyboard.type(message);
            await waitForDelay(500);
            await page.click('.msg-form__send-button');
            setTimeout(() => resolve(true), 1000);
    
            /* PATCHED
            if (process.env.UNREAD_AFTER_SEND == 'true') {
                await waitForDelay(1000);
                await page.evaluate(() => {
                    document.querySelector('.msg-thread-actions__control').click();
                    setTimeout(() => {
                        document.querySelectorAll('.msg-thread-actions__dropdown-container .msg-thread-actions__dropdown-option')[2].click();
                    }, 100);
                });
            }
            */
        } catch(e) {
            resolve(false);
        }
    });
}

/**
 * Format answer according to the message and add signature
 * @param {string} name 
 * @param {string} message 
 * @param {boolean} isFirstMessage 
 * @returns {string}
 */
async function formatAnswer(name, message, isFirstMessage) {
    const answers = JSON.parse(await fs.readFile('answers.json'));
    let names = name.match(/(.*)\s(.*)/);
    let response;

    return await openAIAnswer(name, message);

    for(let i = 0; i < answers.length; i++) {
        if(answers[i].matchs && (new RegExp('\\b' + answers[i].matchs.join('\\b|\\b') + '\\b', 'i') ).test(message) ) {
            if(answers[i].isFirstMessage) {
                if(answers[i].isFirstMessage === isFirstMessage) {
                    response = answers[i].response;
                    break;
                }
            } else {
                response = answers[i].response;
                break;
            }
        } else {
            if(answers[i].isFirstMessage === isFirstMessage) {
                response = answers[i].response;
                break;
            }
        }
    }

    response = response.replace(/\{name\}/g, name);
    response = response.replace(/\{firstname\}/g, names[1]);
    response = response.replace(/\{lastname\}/g, names[2]);

    if(process.env.SIGNATURE) {
        response += '\n\n' + process.env.SIGNATURE;
    }

    return response;
}

async function openAIAnswer(nom, message) {
    return new Promise(async (resolve) => {
        const { Configuration, OpenAIApi } = require("openai");

        const configuration = new Configuration({
            apiKey: process.env.OPENAI_API_KEY,
        });
        const openai = new OpenAIApi(configuration);

        const response = await openai.createCompletion({
            model: "text-davinci-002",
            prompt: "Human s'appelle " + nom + " et AI s'appelles Thomas et parle en Francais.\nHuman: " + message + "\nAI:",
            temperature: 1,
            max_tokens: 150,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0.6,
            stop: ["Human:", "AI:"]
        });
        resolve(response.data.choices[0].text.trim());
    })
}

/**
 * Save cookies to file
 * @param {Page} page 
 */
async function saveCookie(page) {
    try {
        const cookies = await page.cookies();
        const cookieJson = JSON.stringify(cookies, null, 2);
        await fs.writeFile('cookies.json', cookieJson);
    } catch(e) {}
}

/**
 * Load cookies from file
 * @param {Page} page 
 */
async function loadCookie(page) {
    try {
        const cookieJson = await fs.readFile('cookies.json');
        const cookies = JSON.parse(cookieJson);
        await page.setCookie(...cookies);
    } catch(e) {}
}