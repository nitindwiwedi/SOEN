This response provides a modular and robust Express.js server using ES6 features, best practices, and error handling.  It's designed for scalability and maintainability.


**Project Structure:**

```
express-es6-server/
├── src/
│   ├── app.js          // Main application file
│   ├── routes/
│   │   └── index.js     // Routes handler
│   ├── controllers/
│   │   └── index.js     // Controller logic
│   ├── middleware/      //Middleware
│   │   └── errorHandler.js //Custom Error Handler
│   └── utils/           //Helper functions (optional)
│       └── ...
├── package.json       // Project dependencies
```

**1. package.json:**

```json
{
  "name": "express-es6-server",
  "version": "1.0.0",
  "description": "Express server with ES6",
  "main": "src/app.js",
  "scripts": {
    "start": "nodemon src/app.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "nodemon": "^3.0.1" //For development, restarts server on changes.
  },
  "type": "module" //Important: Enables ES modules
}
```

**2. src/app.js:**

```javascript
import express from 'express';
import { routes } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';


const app = express();
const port = process.env.PORT || 3000;


// Middleware to parse JSON bodies
app.use(express.json());

//Mount Routes
app.use('/', routes);


//Error Handling Middleware - MUST be after routes
app.use(errorHandler);


app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

```

**3. src/routes/index.js:**

```javascript
import express from 'express';
import {getHelloWorld, postHelloWorld} from '../controllers/index.js';

const router = express.Router();


// Define routes
router.get('/hello', getHelloWorld); //Example GET route
router.post('/hello',postHelloWorld); // Example POST route


export { router as routes };
```

**4. src/controllers/index.js:**

```javascript
//Example controller functions
export const getHelloWorld = (req, res) => {
    res.send('Hello World from GET!');
};

export const postHelloWorld = (req,res) =>{
    res.send('Hello World from POST!');
}
```

**5. src/middleware/errorHandler.js:**

```javascript
export const errorHandler = (err, req, res, next) => {
    console.error(err.stack); // Log the error for debugging
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
};
```

**How to run:**

1.  Make sure you have Node.js and npm (or yarn) installed.
2.  Clone or download the project.
3.  Navigate to the project directory in your terminal.
4.  Run `npm install` to install the dependencies.
5.  Run `npm start` to start the server.


This example showcases a basic structure. You can expand it by adding more routes, controllers, middleware (for authentication, validation, etc.), and utilities as needed.  Remember to handle potential errors at each stage (e.g., database interactions, external API calls) to create a robust application.  The error handler middleware is crucial for gracefully managing unexpected errors.  Always strive for clean, modular, and well-documented code.


