var express=require('express');
var session=require('express-session');
var bodyParser=require('body-parser');
var app=express();
var multer = require('multer');
var db=require('./database_con.js');
var sendVarifyMail=require('./mail_send.js');

app.use(session({secret:"test123!@#"}));
app.use(bodyParser.urlencoded({extended:true}));
app.set('view engine','ejs');
app.use(express.static(__dirname+"/public"));

var storage=multer.diskStorage({
    destination:(req,file,cb)=>{
        cb(null,"public/uploads/");
    },
    filename:(req,file,cb)=>{
        cb(null,Date.now()+"-"+req.session.userid+"-"+file.originalname);
    }

});
//login form
app.get('/',function(req,res){
    var msg="";
    if(req.session.msg!="")
        msg=req.session.msg;
    res.render('login',{msg:msg});
});
app.post('/login_submit',function(req,res){
    const {email,pass} = req.body;
    let sql = "";
    if(isNaN(email)){
        sql = "select * from user where email = '"+email+"' and password = '"+pass+"' and status = 1 and softdelete = 0";
    }
    else{
        sql = "select * from user where mobile = "+email+" and password = '"+pass+"' and status = 1 and softdelete = 0";
    }
    db.query(sql,function(err,result,fields){
        if(err) throw err;
        if(result.length == 0){
            res.render('login',{msg:"Invalid Credentials"});
        }
        else{
            req.session.userid = result[0].uid;
            req.session.un = result[0].username;
            res.redirect('/home');
        }
    })
});
app.get('/signup',function(req,res){
    res.render('signup',{errmsg:""});
})
app.post('/reg_submit',(req,res)=>{
    const {fname,mname,lname,email,pass,cpass,dob,gender,username}=req.body;
    let sql_check="";

    if(isNaN(email)){
        sql_check="select email from user where email ='"+email+"'";
    }
    else{
        sql_check="select mobile from user where mobile ="+email;
    }
    db.query(sql_check,function(err,result,fields){
        if(err){
            throw err;
        }
        if(result.length==1){
            let errmsg="";
            if(isNaN(email)){
                errmsg="Email already exists !";
            }
            else{
                errmsg="Mobile No. already exists !";
            }


            res.render('signup',{errmsg:errmsg});
        }
        else{
            //code for inserting value in database;
            let sql="";
            if(isNaN(email))
                sql="insert into user(fname,mname,lname,email,password,dob,dor,gender,username) values(?,?,?,?,?,?,?,?,?)";
            else
                sql="insert into user(fname,mname,lname,email,password,dob,dor,gender,username) values(?,?,?,?,?,?,?,?.?)";
                let t=new Date();
                let m=t.getMonth()+1;
                let dor=t.getFullYear()+"-"+m+"-"+t.getDate();

                db.query(sql,[fname,mname,lname,email,pass,dob,dor,gender,username],function(err,result){
                    if(err)
                        throw err;
                    
                    if(result.insertId>0){
                        if(isNaN(email))
                            sendVarifyMail(email);
                        req.session.msg="Account created please check email to varify email";
                        res.redirect('/');
                    }
                    else{
                        res.render('signup',{errmsg:"Can not complete signup, try again"});
                    }
                });

        }
    });
})

app.get('/home',function(req,res){
    if(req.session.userid!=""){
        let msg="";
        if(req.session.msg!="")
            msg=req.session.msg;
            let sql= "select * from tweet inner join user on user.uid = tweet.uid where tweet.uid=? or tweet.uid in (select follow_id from user_follows where uid=?) or tweet.post like '%"+req.session.un+"%' order by tweet.datetime desc";
            // console.log(sql)
            db.query(sql,[req.session.userid,req.session.userid],function(err,result,fields){
                if(err)
               throw err;
            res.render('home',{result:result,msg:msg});
            });
        //res.render('home',{data:"",msg:msg});
    }
    else{
        req.session.msg="Please login first to view home page";
        res.redirect('/');
    }
});
app.get('/logout',function(req,res){
    req.session.userid="";
    res.redirect('/');
});

app.get('/editprofile',function(req,res){
    db.query("select * from user where uid=?",[req.session.userid],function(err,result,fields){
        if(err)
            throw err;
        if(result.length==1){
            res.render('editprofile',{msg:"",result:result});
        }
        else
            res.redirect('/');
    });
});

app.post('/edit_profile_submit',function(req,res){
    const {fname,mname,lname,about}=req.body;
    let sqlupdate="update user set fname=?,mname=?,lname=?,about=? where uid=?";

    db.query(sqlupdate,[fname,mname,lname,about,req.session.userid],function(err,result){
        if(result.affectedRows==1){
            req.session.msg="data updated";
            res.redirect('/home');
        }
        else{
            req.session.msg="can not update profile";
            res.redirect('/home');
        }
    });
});

app.get('/followers',function(req,res){
    let sql="select * from user where uid in (select uid from user_follows where follow_id=?)";

    db.query(sql,[req.session.userid],function(err,result,fields){
        if(err)
            throw err;
        res.render('followers_view',{result:result,msg:""});
    });
});

app.get('/following',function(req,res){
    let sql="select * from user where uid in (select follow_id from user_follows where uid=?)";

    db.query(sql,[req.session.userid],function(err,result,fields){
        if(err)
            throw err;
        res.render('following_view',{result:result,msg:""});
    });
});

var upload_detail = multer({storage:storage});
app.post('/tweet_submit',upload_detail.single('tweet_img'),function(req,res){
    const{post}=req.body;
    var filename="";
    var mimetype="";
    try{
        filename=req.file.filename;
        mimetype=req.file.mimetype;
    }
    catch(err){
        console.log(err);
    }

    var d=new Date();
    var m=d.getMonth()+1;
    var ct=d.getFullYear()+"-"+m+"-"+d.getDate()+" "+d.getHours()+":"+d.getMinutes()+":"+d.getSeconds();

    let sql="insert into tweet(uid,post,datetime,image_vdo_name,type) values(?,?,?,?,?)";

    db.query(sql,[req.session.userid,post,ct,filename,mimetype],function(err,result){
        if(err)
            throw err;
        if(result.insertId>0)
            req.session.msg="Tweet done";
        else
            req.session.msg="Can not tweet your post";
        res.redirect('/home');
    });
});

app.get('/varifyemail',function(req,res){
    let email=req.query['email'];
    let sql_update="update user set status=1 where email=?";
    db.query(sql_update,[email],function(err,result){
        if(err)
            console.log(err);
        if(result.affectedRows==1){
            req.session.msg="Email varified now you can login with your password and email";
            res.redirect('/');//redirecting to login page
        }
        else{
            req.session.msg="Can not varify your email contact website admin";
            res.redirect('/');
        }
    });
});

app.get('/changepassword', (req, res) => {
    res.render('change_password');
});

app.post('/changepassword', (req, res) => {
    const { username, oldPassword, newPassword } = req.body;
    
    db.query(
        'SELECT * FROM user WHERE username = ? AND password = ?',
        [username, oldPassword],
        (error, results) => {
            if (error) throw error;
            
            if (results.length > 0) {
                db.query(
                    'UPDATE user SET password = ? WHERE username = ?',
                    [newPassword, username],
                    (error, results) => {
                        if (error) throw error;
                        
                        res.send('Password updated successfully.');
                    }
                );
            } else {
                res.send('Invalid username or password.');
            }
        }
    );
});

app.get('/profile', (req, res) => {
    db.query("select * from user where uid=?",[req.session.userid],function(err,result,fields){
        if(err)
            throw err;
        if(result.length==1){
            res.render('profile',{msg:"",result:result});
        }
        else
            res.redirect('/');
    });
});


app.post('/uploadProfilePicture', upload_detail.fields([{ name: 'headerPicture', maxCount: 1 }, { name: 'profilePicture', maxCount: 1 }]), function(req, res) {
    const { headerPicture, profilePicture } = req.files;

    if (!headerPicture || !profilePicture) {
        return res.status(400).send('Both headerPicture and profilePicture are required.');
    }

    const headerFilename = headerPicture[0].filename;
    const profileFilename = profilePicture[0].filename;

    const updateSql = 'UPDATE user SET headerpic = ?, profilepic = ? WHERE uid = ?';
    db.query(updateSql, [headerFilename, profileFilename, req.session.userid], function(err, result) {
        if (err) {
            console.log(err);
            return res.status(500).send('Internal Server Error');
        }

        if (result.affectedRows === 1) {
            return res.send('Files uploaded successfully and database updated.');
        } else {
            return res.status(500).send('Error updating the database.');
        }
    });
});



app.listen(8081,function(){
    console.log("server runninng at localhost 8081 port")
});