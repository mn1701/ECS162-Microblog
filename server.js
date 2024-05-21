const express = require('express');
const expressHandlebars = require('express-handlebars');
const session = require('express-session');
const canvas = require('canvas');

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Configuration and Setup
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const app = express();
const PORT = 3000;

/*
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    Handlebars Helpers

    Handlebars helpers are custom functions that can be used within the templates 
    to perform specific tasks. They enhance the functionality of templates and 
    help simplify data manipulation directly within the view files.

    In this project, two helpers are provided:
    
    1. toLowerCase:
       - Converts a given string to lowercase.
       - Usage example: {{toLowerCase 'SAMPLE STRING'}} -> 'sample string'

    2. ifCond:
       - Compares two values for equality and returns a block of content based on 
         the comparison result.
       - Usage example: 
            {{#ifCond value1 value2}}
                <!-- Content if value1 equals value2 -->
            {{else}}
                <!-- Content if value1 does not equal value2 -->
            {{/ifCond}}
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
*/

// Set up Handlebars view engine with custom helpers
//
app.engine(
    'handlebars',
    expressHandlebars.engine({
        helpers: {
            toLowerCase: function (str) {
                return str.toLowerCase();
            },
            ifCond: function (v1, v2, options) {
                console.log(`Comparing ${v1} with ${v2}`); // Debugging line
                if (v1 === v2) {
                    return options.fn(this);
                }
                return options.inverse(this);
            },
        },
    })
);

app.set('view engine', 'handlebars');
app.set('views', './views');

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Middleware
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

app.use(
    session({
        secret: 'oneringtorulethemall',     // Secret key to sign the session ID cookie
        resave: false,                      // Don't save session if unmodified
        saveUninitialized: false,           // Don't create session until something stored
        cookie: { secure: false },          // True if using https. Set to false for development without https
    })
);

// Replace any of these variables below with constants for your application. These variables
// should be used in your template files. 
// 
app.use((req, res, next) => {
    res.locals.appName = 'Tooters';
    res.locals.copyrightYear = 2024;
    res.locals.postNeoType = 'Toot';
    res.locals.loggedIn = req.session.loggedIn || false;
    res.locals.userId = req.session.userId || '';
    res.locals.user = getCurrentUser(req) || {};
    console.log('res.locals.loggedIn:', res.locals.loggedIn);
    next();
});

app.use(express.static('public'));                  // Serve static files
app.use(express.urlencoded({ extended: true }));    // Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.json());                            // Parse JSON bodies (as sent by API clients)

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Routes
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Home route: render home view with posts and user
// We pass the posts and user variables into the home
// template
//
app.get('/', (req, res) => {
    const posts = getPosts();
    const user = getCurrentUser(req) || {};
    res.render('home', { posts, user });
});

// Register GET route is used for error response from registration
//
app.get('/register', (req, res) => {
    res.render('loginRegister', { regError: req.query.error });
});

// Login route GET route is used for error response from login
//
app.get('/login', (req, res) => {
    res.render('loginRegister', { loginError: req.query.error });
});

// Error route: render error page
//
app.get('/error', (req, res) => {
    res.render('error');
});

// Additional routes that you must implement

app.get('/post/:id', (req, res) => {
    const post = posts.find(p => p.id === parseInt(req.params.id));
    if (post) {
        res.render('postDetail', { post });
      } else {
        res.redirect('/error');
      }
});
app.post('/posts', (req, res) => {
    const user = getCurrentUser(req);
    if (user) {
        addPost(req.body.title, req.body.content, user);
        res.redirect('/');
    } else {
        res.redirect('/login');
    }
});
app.post('/like/:id', (req, res) => {
    updatePostLikes(req, res);;
});

app.get('/profile', isAuthenticated, (req, res) => {
    renderProfile(req, res);
  });
  
app.get('/avatar/:username', (req, res) => {
    handleAvatar(req, res);
});

app.post('/register', (req, res) => {
    registerUser(req, res);
});
  
app.post('/login', (req, res) => {
    loginUser(req, res);
});

app.get('/logout', (req, res) => {
    logoutUser(req, res);
});

app.post('/delete/:id', isAuthenticated, (req, res) => {
  const postId = parseInt(req.params.id);
  const user = getCurrentUser(req);
  const postIndex = posts.findIndex(p => p.id === postId);
  if (postIndex !== -1 && posts[postIndex].username === user.username) {
    posts.splice(postIndex, 1);
  }
  res.redirect('/profile');
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Server Activation
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Support Functions and Variables
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Example data for posts and users
let users = [
    {
        id: 1,
        username: 'TravelGuru',
        avatar_url: undefined,
        memberSince: '2024-05-01 10:00'
    },
    {
        id: 2,
        username: 'FoodieFanatic',
        avatar_url: undefined,
        memberSince: '2024-05-01 11:30'
    },
    {
        id: 3,
        username: 'TechSage',
        avatar_url: undefined,
        memberSince: '2024-05-01 12:15'
    },
    {
        id: 4,
        username: 'EcoWarrior',
        avatar_url: undefined,
        memberSince: '2024-05-01 13:45'
    }
];

// Posts object array
let posts = [
    {
        id: 1,
        title: 'Exploring Hidden Gems in Europe',
        content: 'Just got back from an incredible trip through Europe. Visited some lesser-known spots that are truly breathtaking!',
        username: 'TravelGuru',
        timestamp: '2024-05-02 08:30',
        likes: 0,
        likedBy: []
    },
    {
        id: 2,
        title: 'The Ultimate Guide to Homemade Pasta',
        content: 'Learned how to make pasta from scratch, and it’s easier than you think. Sharing my favorite recipes and tips.',
        username: 'FoodieFanatic',
        timestamp: '2024-05-02 09:45',
        likes: 0,
        likedBy: []
    },
    {
        id: 3,
        title: 'Top 5 Gadgets to Watch Out for in 2024',
        content: 'Tech enthusiasts, here’s my list of the top 5 gadgets to look out for in 2024. Let me know your thoughts!',
        username: 'TechSage',
        timestamp: '2024-05-02 11:00',
        likes: 0,
        likedBy: []
    },
    {
        id: 4,
        title: 'Sustainable Living: Easy Swaps You Can Make Today',
        content: 'Making the shift to sustainable living is simpler than it seems. Sharing some easy swaps to get you started.',
        username: 'EcoWarrior',
        timestamp: '2024-05-02 13:00',
        likes: 0,
        likedBy: []
    }
];

// Function to find a user by username
function findUserByUsername(username) {
    return users.find(user => user.username === username);
}

// Function to find a user by user ID
function findUserById(userId) {
    return users.find(user => user.id === userId);
}

// Function to add a new user
function addUser(username) {
    const timestamp = new Date().toISOString();
    const formattedTimestamp = formatTimestamp(timestamp, false);

    const newUser = {
        id: users.length + 1,
        username,
        avatar_url: undefined,
        memberSince: formattedTimestamp
    };
    users.push(newUser);
    return newUser;
}

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    console.log(req.session.userId);
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Function to register a user
function registerUser(req, res) {
    const { username } = req.body;
    if (findUserByUsername(username)) {
        res.redirect('/register?error=Username already exists');
    } else {
        const newUser = addUser(username);
        req.session.userId = newUser.id;
        req.session.loggedIn = true;
        res.redirect('/');
    }
}

// Function to login a user
function loginUser(req, res) {
    const { username } = req.body;
    const user = findUserByUsername(username);
    if (user) {
        req.session.userId = user.id;
        req.session.loggedIn = true;
        res.redirect('/');
    } else {
        res.redirect('/login?error=Invalid username');
    }
}

// Function to logout a user
function logoutUser(req, res) {
    req.session.destroy();
    res.redirect('/');
}

// Function to render the profile page
function renderProfile(req, res) {
    const user = getCurrentUser(req);
    if (user) {
        const userPosts = posts.filter(post => post.username === user.username);
        res.render('profile', { user, posts: userPosts });
    } else {
        res.redirect('/login');
    }
}

// Function to update post likes
function updatePostLikes(req, res) {
    const user = getCurrentUser(req);
    if (user) {
        const post = posts.find(p => p.id === parseInt(req.params.id));
        if (post && post.username !== user.username) {
            const userIndex = post.likedBy.indexOf(user.id);
            if (userIndex === -1) {
                // Like the post
                post.likes += 1;
                post.likedBy.push(user.id);
            } else {
                // Unlike the post
                post.likes -= 1;
                post.likedBy.splice(userIndex, 1);
            }
        }
    }
    res.redirect('/');
}

// Function to handle avatar generation and serving
function handleAvatar(req, res) {
    const user = users.find(u => u.username === req.params.username);
    if (user) {
        const avatar = generateAvatar(user.username[0]);
        res.type('png');
        res.send(avatar);
    } else {
        res.redirect('/error');
    }
}

// Function to get the current user from session
function getCurrentUser(req) {
    return findUserById(req.session.userId);
}

// Function to get all posts, sorted by latest first
function getPosts() {
    return posts.slice().reverse();
}

// format time helper function
function formatTimestamp(isoString, includeTime = true) {
    const date = new Date(isoString); 

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    if (includeTime) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    } else {
        return `${year}-${month}-${day}`;
    }
}

// Function to add a new post
function addPost(title, content, user) {
    const timestamp = new Date().toISOString();
    const formattedTimestamp = formatTimestamp(timestamp);

    const newPost = {
        id: posts.length + 1,
        title,
        content,
        username: user.username,
        timestamp: formattedTimestamp,
        likes: 0,
        likedBy: []
    };
    posts.push(newPost);
}

// Function to generate an image avatar
function generateAvatar(letter, width = 100, height = 100) {
    const newCanvas = canvas.createCanvas(width, height);
    const ctx = newCanvas.getContext('2d');
    const colors = ['#FF5733', '#33FF57', '#3357FF', '#F333FF', '#FF33F6', 
                    '#FFBD33', '#33FFBD', '#BD33FF', '#FF5733', '#FF3380',
                    '#3380FF', '#80FF33', '#33FF80', '#3380FF', '#FF8033', 
                    '#8033FF', '#3380FF', '#FF3380', '#80FF33', '#33FF80'];
    const color = colors[letter.charCodeAt(0) % colors.length];

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 50px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, width / 2, height / 2);

    return newCanvas.toBuffer();
}



