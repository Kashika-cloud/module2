const express = require("express");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

const usersFile = path.join(__dirname, "data", "users.json");
const blogsFile = path.join(__dirname, "data", "blogs.json");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(__dirname));

function readData(file) {
    try {
        return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (error) {
        return [];
    }
}

function writeData(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Home
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// User Registration
app.post("/api/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        const users = readData(usersFile);

        const existingUser = users.find(
            user => user.email.toLowerCase() === email.toLowerCase()
        );

        if (existingUser) {
            return res.status(409).json({
                message: "User already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            id: Date.now(),
            name,
            email,
            password: hashedPassword
        };

        users.push(newUser);
        writeData(usersFile, users);

        res.status(201).json({
            message: "Registration successful",
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email
            }
        });

    } catch (error) {
        res.status(500).json({
            message: "Server error"
        });
    }
});

// User Login
app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const users = readData(usersFile);

        const user = users.find(
            user => user.email.toLowerCase() === email.toLowerCase()
        );

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        res.json({
            message: "Login successful",
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        res.status(500).json({
            message: "Server error"
        });
    }
});

// Create Blog
app.post("/api/blogs", (req, res) => {
    try {
        const { title, content, author } = req.body;

        if (!title || !content || !author) {
            return res.status(400).json({
                message: "Title, content and author are required"
            });
        }

        const blogs = readData(blogsFile);

        const newBlog = {
            id: Date.now(),
            title,
            content,
            author,
            createdAt: new Date().toISOString()
        };

        blogs.push(newBlog);
        writeData(blogsFile, blogs);

        res.status(201).json({
            message: "Blog created successfully",
            blog: newBlog
        });

    } catch (error) {
        res.status(500).json({
            message: "Server error"
        });
    }
});

// Get all blogs
app.get("/api/blogs", (req, res) => {
    const blogs = readData(blogsFile);

    res.json({
        message: "Blogs fetched successfully",
        blogs
    });
});

// Get single blog
app.get("/api/blogs/:id", (req, res) => {
    const blogs = readData(blogsFile);

    const blog = blogs.find(
        blog => blog.id == req.params.id
    );

    if (!blog) {
        return res.status(404).json({
            message: "Blog not found"
        });
    }

    res.json(blog);
});

// Delete blog
app.delete("/api/blogs/:id", (req, res) => {
    const blogs = readData(blogsFile);

    const updatedBlogs = blogs.filter(
        blog => blog.id != req.params.id
    );

    if (blogs.length === updatedBlogs.length) {
        return res.status(404).json({
            message: "Blog not found"
        });
    }

    writeData(blogsFile, updatedBlogs);

    res.json({
        message: "Blog deleted successfully"
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});