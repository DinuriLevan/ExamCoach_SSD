# ExamCoach Backend

This is the backend for the ExamCoach application, built with Node.js, Express, and MongoDB.

## Prerequisites

- Node.js (v14 or higher)
- MongoDB running locally or a connection string to a remote instance.

## Installation

1. Navigate to the `Backend` directory:
   ```bash
   cd Backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root of the `Backend` directory with the following variables:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/examcoach
   ```

## Running the Server

### Development Mode
To run the server with hot-reloading (using nodemon):
```bash
npm run dev
```

### Production Mode
To run the server normally:
```bash
npm start
```

## Folder Structure

- `config/`: Configuration files (e.g., database connection).
- `controllers/`: Logic for handling requests.
- `models/`: Mongoose schemas and models.
- `routes/`: API route definitions.
- `middleware/`: Custom middleware functions.
- `index.js`: Main entry point.

## API Endpoints

- `GET /`: Health check endpoint. Returns "API is running...".
