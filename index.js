const exprese = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const cors = require('cors');
const session = require('express-session');
const secret = "ashutosh";
const port = 9999;
const app = exprese();
app.use(exprese.json());
app.use(cors({
    credentials: true,
    origin: "http://localhost:8080"
}));

app.use(session({
     secret: secret,
     cookie:{maxAge: 1*60*60*1000}
}))
 
const database = mongoose.createConnection("mongodb://localhost:27017/NewtonTodo", {useNewUrlParser: true, useUnifiedTopology: true});
const userSchema = new mongoose.Schema({
    userName: String,
    password: String
})
const TodoSchema = new mongoose.Schema({
    task: String,
    done: Boolean,
    creationTime: Date,
    userId: mongoose.Schema.Types.ObjectId
})
const userModel = database.model("user", userSchema);
const TodoModel = database.model("todo", TodoSchema);
const Salt = 3;
const IsNullOrundefined = (val) => val === null || val === undefined;

app.post('/signup', async (req, res)=>{
    const {userName, password} = req.body;
    const ExistingUser = await userModel.findOne({userName})
    if(IsNullOrundefined(ExistingUser)){
         const BctyprPassword = bcrypt.hashSync(password, Salt);
          const newUser = new userModel({userName, password:BctyprPassword});
          await newUser.save();
          req.session.userId = newUser._id;
          res.status(201).send({ success: "Signed up" });
    }else{
        res.status(400).send({err:`user ${userName} already exists`});
    }
});

app.post('/login', async (req, res)=>{
    const {userName, password} = req.body;
    const ExistingUser = await userModel.findOne({userName});
    if(IsNullOrundefined(ExistingUser)){
        res.status(401).send({ err: "UserName does not exist." });
    }else{
        const hasedPassword = ExistingUser.password;
        if(bcrypt.compareSync(password, hasedPassword)){
            req.session.userId = ExistingUser._id;
            res.status(200).send({success:`login success`});
        }else{
            res.status(401).send({err:`password incorrect`});
        }   
    }
});

const AuthMiddleWare = async (req, res, next)=>{
   if(IsNullOrundefined(req.session.userId) || IsNullOrundefined(req.session)){
    res.status(401).send({ err: "Not logged in" });
   }else{
       next();
   }
};
app.get('/todo',AuthMiddleWare, async (req, res)=>{
   const data = await TodoModel.find({userId: req.session.userId});
   res.send(data);
});

app.post('/todo',AuthMiddleWare, async (req, res)=>{
    const todo = req.body;
     todo.creationTime = new Date();
     todo.done = false;
     todo.userId = req.session.userId;
     
     const newTodo = new TodoModel(todo);
     await newTodo.save();
     res.send(newTodo);
});

app.put('/todo/:id',AuthMiddleWare, async (req, res)=>{
    const TodoId = req.params.id;
    const {task} = req.body;
    try{
        const ExistingTodo = await TodoModel.findOne({_id:TodoId, userId: req.session.userId});
        if(IsNullOrundefined(ExistingTodo)){
            res.sendStatus(404);
        }else{
            ExistingTodo.task = task;
           await ExistingTodo.save();
           res.send(ExistingTodo);
        }
    }catch(err){
        res.sendStatus(404);
    }    
});

app.delete('/todo/:id', AuthMiddleWare, async (req, res)=>{
    const TodoId = req.params.id;
    try{
        const todo = await TodoModel.deleteOne({_id: TodoId, userId: req.session.userId});
        res.sendStatus(200);
    }catch(e){
        res.sendStatus(404);
    }   
});

app.get("/logout", (req, res)=> {
    if(!IsNullOrundefined(req.session)) {
        // destroy the session
        req.session.destroy(() => {
            res.sendStatus(200);
        });

    } else {
        res.sendStatus(200);
    }
});

app.get('/userinfo', AuthMiddleWare, async (req, res)=>{
    const user = await userModel.findById({_id: req.session.userId});
    res.send({userName:user.userName});
})

app.listen(port, ()=> console.log(`App listening on port ${port}`));