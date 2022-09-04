## About The Project

Linkedin responder allows you to have an automatic answering machine for your received messages.

It is different from the tool offered by LinkedIn Premium, because it is completely customizable and not only an answering machine when you are on leave.

## Getting Started

### Prerequisites

This is an example of how to list things you need to use the software and how to install them.

1. Installing dependencies
```sh
  npm install
```

2. Rename **.env.example** to **.env**
3. Put your email and password
4. *Optional : SIGNATURE allows you to add a message at the end*

### Answers

Fill in the **answers.json** file with the answers you want.
This is a list with a priority order, put the highest as high as possible.

- **matchs:** Allows you to detect keywords.
- **IsFirstMessage:** Lets you know if this is his first message
- **response:** Put your answer here
  - To jump on the line use *\n* because the json does not allow the multiline
  - To add the name of the person use *{name}*
  - The person's first name use *{firstname}*
  - And the lastname use *{lastname}*


## Usage

To start the responder run the command

```sh
  npm run start
```

The recommended way is to use pm2

```sh
  npm install pm2@latest -g
```

```sh
  pm2 start linkedin-responder.js --name linkedin-responder
```
```sh
  pm2 save
```

## Problems

If you have a Captcha at the opening of LinkedIn, launch in headless mode with
```sh
  npm run dev
```
and once connected you can relaunch normal way.

If you do not have a graphical interface, connect you to your machine and copy the **cookies.json** file to the server/

## Contributing

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue.

1. Fork the Project
2. Create your Feature Branch (git checkout -b feature/AmazingFeature)
3. Commit your Changes (git commit -m 'Add some AmazingFeature')
4. Push to the Branch (git push origin feature/AmazingFeature)
5. Open a Pull Request

***

## License

MIT License

Copyright (c) 2021 Othneil Drew

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.