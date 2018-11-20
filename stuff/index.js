const bodyParser = require('body-parser');
const express = require('express');
const app = express();
const sqlite = require('sqlite');
const bcrypt = require('bcrypt');
const uuidv4 = require('uuid/v4');
const cookieParser = require('cookie-parser')


app.set('view engine', 'twig');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.disable('view cache');
const saltRounds = 10;
const dbPromise = sqlite.open('./MovieData.db');

dbPromise.then(async (db) => {
    await db.run('CREATE TABLE IF NOT EXISTS user_review ( id INTEGER PRIMARY KEY, username STRING, review STRING );');
    //await db.run('CREATE TABLE IF NOT EXISTS user_account ( user_id INTEGER PRIMARY KEY, username STRING, password STRING );');
    await db.run('CREATE TABLE IF NOT EXISTS sessions ( id INTEGER PRIMARY KEY, user_id INTEGER, sessionToken STRING );');
});

//asdf
// const authorize = async (req, res, next) => {
//   //  const { sessionToken } = req.cookies;
//     const db = await dbPromise;
//     const sessionToken = req.cookies.sessionToken;
//     if(!sessionToken) {
//         next();
//         return;
//     };
//     // //const user = await db.get('SELECT user_account.username, user_account.user_id as user_id FROM sessions LEFT JOIN user_account ON sessions.user_id = users.id WHERE sessionToken=?', sessionToken);
//     // if(!user) {
//     //     next();
//     //     return;
//     // };
//     // console.log('logged in', user.username);
//     // req.user = user;
//     // next();
//     // return;
// };

// const requireAuth = (req, res, next) => {
//     if (!req.user) {
//         res.status(401).send('please log in');
//         return;
//     }
//     next();
// };
//
// app.use(authorize);

app.get('/', async (req, res) => {
    const db = await dbPromise;
    const user_review = await db.all('SELECT * FROM user_review;');
    const user = req.user;
    res.render('index',{ user_review, user});
});

app.get('/login', async (req, res) => {
    if (req.user) {
        res.redirect('/');
        return;
    }
    res.render('login');
});

app.get('/register', async (req, res) => {
    if (req.user) {
        res.redirect('/');
        return;
    }
    res.render('register');
});

app.post('/review',  async (req, res) => {
    const db = await dbPromise;
    await db.run('INSERT INTO user_review (user_id, review) VALUES (?, ?)', req.user.username.split('@')[0], req.body.review);
    console.log("button");
    res.redirect('/');
});

app.post('/register', async (req, res) => {
    const db = await dbPromise;
    const user = await db.get('SELECT * FROM user_account WHERE username=?', req.body.username);
    if (user) {
        res.status(400).render('register', { registerError: 'account already exists' });
        return;
    }
    const passwordHash = await bcrypt.hash(req.body.password, saltRounds);
    await db.run(
        'INSERT INTO user_account (username, password)  VALUES (?, ?);',
        req.body.username,
        passwordHash
    );
    const newUser = db.get('SELECT user_id, username FROM user_account WHERE username=?', req.body.username);
    const sessionToken = uuidv4();
    await db.run(
        'INSERT INTO sessions (user_id, sessionToken) VALUES (?, ?);',
        newUser.id,
        sessionToken
    );
    res.cookie('sessionToken', sessionToken);
    res.redirect('/');
});

app.post('/login', async (req, res) => {
    const db = await dbPromise;
    const user = await db.get('SELECT * FROM user_account WHERE username=?', req.body.username);
    if (!user) {
        res.status(401).render('login', { loginError: 'email or password is incorrect' });
        return;
    }
    const passwordMatches = await bcrypt.compare(req.body.password, user.password);
    if (passwordMatches) {
        const sessionToken = uuidv4();
        await db.run('INSERT INTO sessions (user_id, sessionToken) VALUES (?, ?);', user.id, sessionToken);
        res.cookie('sessionToken', sessionToken);
        res.redirect('/');
    } else {
        res.status(401).render('login', { loginError: 'email or password is incorrect' });
    }
})

app.get('/logout', async (req, res) => {
    const db = await dbPromise;
    res.cookie('sessionToken', '', { maxAge: 0 });
    await db.run('DELETE FROM sessions WHERE sessionToken=?', req.cookies.sessionToken);
    res.redirect('/');
})

app.get('/databasedump', async (req, res) => {
    const db = await dbPromise;
    const tables = await db.all('SELECT name FROM sqlite_master WHERE type="table"');
    const users = await db.all('SELECT * FROM users');
    const user_review = await db.all('SELECT * FROM user_review');
    const sessions = await db.all('SELECT * FROM sessions');
    res.json({
        tables,
        user,
        user_review,
        sessions
    })
})

app.use((req, res) => {
    res.status(404).send('file not found');
})

app.listen(3000);
console.log('listening on port 3000');
