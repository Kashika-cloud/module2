# Module 2 - Backend Development

## Internship Module

This project implements a backend for a Blog Application using Node.js and Express.js.

## Technologies Used

- Node.js
- Express.js
- JavaScript
- REST API
- HTML
- CSS
- Fetch API
- JSON File Storage
- bcryptjs

## Features

### User Registration

Users can register using:

- Name
- Email
- Password

Passwords are securely hashed using bcryptjs.

### User Login

Registered users can log in using their email and password.

### Blog Creation

Logged-in users can create blogs with:

- Blog title
- Blog content
- Author

### Blog Management

Users can:

- View all blogs
- View individual blogs
- Delete blogs

## REST API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/register | Register user |
| POST | /api/login | Login user |
| POST | /api/blogs | Create blog |
| GET | /api/blogs | Get all blogs |
| GET | /api/blogs/:id | Get one blog |
| DELETE | /api/blogs/:id | Delete blog |

## Installation

Clone the repository.

Install dependencies:

npm install

Start the server:

npm start

Open:

http://localhost:3000

## Project Structure

module2/
│
├── data/
│   ├── users.json
│   └── blogs.json
│
├── public/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── create-blog.html
│   ├── style.css
│   └── main.js
│
├── .gitignore
├── package.json
├── server.js
└── README.md