const express= require('express');
const mongoose = require('mongoose');
const path= require('path');
require('dotenv').config();

const cookieParser= require('cookie-parser')

const bcrypt= require('bcryptjs');
const salt= bcrypt.genSaltSync(10);

const jwt= require('jsonwebtoken')
const secret= process.env.secret

const User = require('./models/User')
const Data= require('./models/Data')

mongoose.connect(process.env.URI);

const _dirname= path.resolve();

const app= express();

app.use(express.static(path.join(_dirname,'client','build')))

app.get('/api/', (req, res)=>{
    res.sendFile(path.join(_dirname, 'client', 'build', 'index.html'))
})

app.use(express.json());
app.use(cookieParser());

app.post('/api/register',async (req,res)=>{
    const {username, password}= req.body;
    try{
        const userDoc = await User.create({
            username, 
            password: bcrypt.hashSync(password,salt)
        });
        res.json(userDoc);

    }catch(e){
        console.log(e);
        res.status(400).json(e);
    }
})

app.post('/api/login', async (req, res)=>{
    const {username, password}= req.body;
    const userDoc= await User.findOne({username});
    const passOK= bcrypt.compareSync(password, userDoc.password);
    if(passOK){
        // res.json(userDoc)
        jwt.sign({username, id: userDoc._id}, secret, {}, (err, token)=>{
            if (err) throw err;
            res.cookie('token', token, {
                httpOnly: true,
                secure: true,
                sameSite:'none'
            }).json({
                username,
                id: userDoc._id,
            })
        })
    }else{
        res.status(400).json("Wrong Credentials")
    }
})

app.get('/api/profile', (req, res)=>{
    const {token}= req.cookies;
    if(token){
        jwt.verify(token, secret, {}, (err, info)=>{
            if (err) throw err;       
            res.json(info);
        })
    }
})

app.post('/api/logout', (req,res)=>{
    res.cookie('token', '', {
        expires: new Date(Date.now() + 5 * 1000),
        httpOnly: true,
        secure: true,
        sameSite: 'none',
    }).json('ok');
})

app.post('/api/data', (req,res)=>{
    const {token}= req.cookies;
    jwt.verify(token, secret, {}, async (err, info)=>{
        if (err) throw err;
        const {title, note, pass}= req.body;
        const postDoc= await Data.create({
            title: title,
            note: note,
            pass: pass,
            author: info.id,
        })
        res.json(postDoc);

    })
})

app.get('/api/data', (req,res)=>{
    
    const {token}= req.cookies;
    if(token){
        jwt.verify(token, secret, {}, async (err, info)=>{
            if(err){
                console.log(err);
                res.json([]);
            }
            else{
                res.json(await Data.find({author: info.id})
                .populate('author')
                .sort({createdAt:-1}));
            }
        })
    }else{
        res.json([]);
    }
})

app.delete('/api/data/:id', (req, res)=>{
    Data.deleteOne({_id: req.params.id}).then(()=>{
        res.json("deleted")
    })
})

const PORT = 4000;

app.listen(PORT, ()=>{
    console.log("listening from server");
})