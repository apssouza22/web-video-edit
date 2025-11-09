# Web Video Edit

Smart WebVideoEdit combines AI and modern web technologies to create a browser-based video editor that enables users to edit videos without downloading or installing any software - no downloads or installations required.


<img src="assets/image.png" alt="Web Video Edit demo" width="500">


## Demo

You can watch a demo of the Web Video Edit application on YouTube: [Web Video Edit Demo](https://www.youtube.com/watch?v=NcByGHQk-zM&t=45s&ab_channel=AlexsandroSouza).

You can try the demo at [smart-web-video-edit](https://apssouza22.github.io/web-video-edit/index.html).

## Architecture Documentation
The architecture documentation for the Web Video Edit application is available in the [docs/architecture](docs/architecture) directory. It includes detailed diagrams and explanations of the system's components, data flow, and module structure.
<img src="docs/architecture/package-organisation.png" alt="System Architecture Overview" width="600"/>


## Installation
WebEdit is a web application that uses vanilla JavaScript, HTML, and CSS. 

### Running with npm and http-server
1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open your browser and navigate to http://localhost:8001

### Jest and ECMAScript Modules
To run tests using Jest with ECMAScript modules, follow these steps:
```
node --experimental-vm-modules
```
