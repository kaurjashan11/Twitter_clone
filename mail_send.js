var nodemailer=require('nodemailer');
async function sendVarifyMail(to_email)
{
let transporter=nodemailer.createTransport({
    service:"gmail",
    host:"smtp.gmail.com",
    port:465,
    secure:false,
    auth:{
        user:"jashanpreet2179@gmail.com",
        pass:"godfgfitfvixdyfr"
    }
});
let info= await transporter.sendMail({
    to:to_email,
    from:"jashanpreet0678.be21@chitkara.edu.in",
    subject:"Varify email for Twitter clone",
    html:"<h2 style=\"color:red\">Please click on link to varify email id</h2><a href=\"http://localhost:8081/varifyemail?email="+to_email+"\">Click here to vaerify</a>"
});
if(info.messageId)
    return true;
else
    return false;
}
module.exports=sendVarifyMail;