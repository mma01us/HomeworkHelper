//
// https://developer.mozilla.org/en-US/docs/Learn/Server-side/Express_Nodejs/Introduction
//
// npm install express
//
var express = require('express');
var app = express();
var hbs = require('hbs');
var cookieSession = require('cookie-session');
var simpleoauth2 = require('simple-oauth2');
var request = require('request');
var mysql = require('mysql');
app.set('view model', 'hbs');
app.set('view engine', 'hbs');
hbs.Handlebars = require('handlebars');
app.use( express.static( __dirname ) );

app.set( 'port' , process.env.PORT || 8080 );
console.log( 'env port = ' + process.env.PORT );
console.log( 'app port = ' + app.get( 'port' ));
var listener = app.listen( app.get( 'port' ) , 
    function() 
    {
        console.log( 'express running, port: ' + listener.address().port ) ;
    }
) ;

// SO EXPRESS KNOWS IT IS SITTING BEHIND A PROXY
app.set( 'trust proxy' , 1 ) ; // trust first proxy 
//
// we are running node from within public, not ..
app.use( express.static( __dirname ) ) ;
//
// TO STORE OUR ION CREDENTIALS ONCE WE GET THEM
app.use( cookieSession(
        {
            name : 'session', // don't change
            keys : ['SecretKee', 'charlesjxxxxxxxxxwang']   // ok to change
        }
    )
);
//
var irl = 'https://ion.tjhsst.edu/';
//
// OAUTH2 Stuff
var ion_client_id     = 'HImg0au1d2YJxP1SQqddVWoRMGi4GLeWetvOl4kz';
var ion_client_secret = '5UoOLyz4JES9xGb4lkMwKYQU8hZapkZnC56FjS9nMUujc4rrhtCn4SCmvVtRAfMQjEuYvKI06TeNcWnMEoDfbBOYcFnjipFS1RlynSw8QUFEJBCp1tKCaIGxr4COfmyF';
//
var oauth2 = simpleoauth2.create(
    {
        client :
        {
            id     : ion_client_id     ,
            secret : ion_client_secret ,
        } ,
        auth :
        {
            tokenHost     : irl + 'oauth/'          ,
            authorizePath : irl + 'oauth/authorize' ,
            tokenPath     : irl + 'oauth/token/'
        }
    }
);
//
// Authorization uri definition
var authorizationUri = oauth2.authorizationCode.authorizeURL(
    {
        scope        : 'read' ,
        redirect_uri : 'https://user.tjhsst.edu/2019mma/login/'
    }
);
//
app.get('/',
    function(req, res)
    {
        var dataObj = {} ;
        //
        dataObj.myTitle = 'ION index' ;
        dataObj.myLink  = authorizationUri ;
        //
        if (typeof req.session.token != 'undefined')
        {
            // IF THE USER HAS LOGGED IN...token.token.access_token!
            var access_token = req.session.token.token.access_token;
            //
            // ASK ION FOR THE USER NAME...and other information
            request.get(
                {
                    url : irl + 'api/profile?format=json&access_token='+access_token
                } , 
                function( error , result , body )
                {
                    var resObj = JSON.parse( body ) ;
                    //
                    dataObj.yourName = resObj['short_name'] ;
                    //
                    dataObj.yourInfo = {} ;
                    //
                    dataObj.yourInfo.email = resObj['tj_email'];
                    dataObj.yourInfo.first = resObj['first_name'];
                    dataObj.yourInfo.last = resObj['last_name'];
                    dataObj.yourInfo.type = resObj['user_type'];
                    dataObj.yourInfo.picture = resObj['picture'];
                    res.render( 'auth' , dataObj ) ;
                }
            );
            
            var con = mysql.createConnection({
                host: "mysql1.csl.tjhsst.edu",
                user: "site_2019mma",
                password: "NqsmYJHHN7rbwwFvchT3SzXz",
                database : "site_2019mma"
            });
            
            con.connect(function(err) {
                if (err) throw err;
                console.log("Connected!");
                con.query('SELECT * FROM colors', function (err, result) {
                    if (err) throw err;
                    for(var key in Object.keys(result)){
                        console.log(key + ": " + result[key]['color_name']);
                    }
                });
            });
        } 
        else 
        {
            dataObj.yourName  = 'NEW_USER' ;
            //
            dataObj.yourInfo  = {} ;
            //
            dataObj.yourInfo.key1 = 'val1' ;
            dataObj.yourInfo.key2 = 'val2' ;
            dataObj.yourInfo.key3 = 'val3' ;
            //
            res.render( 'auth' , dataObj ) ;
        }
    }
);

app.get('/login',
    function(req, res)
    {
        var theCode = req.query.code ;
        //
        // Construct options that will be used to generate a login token
        var options = {
            code         : theCode ,
            redirect_uri : 'https://user.tjhsst.edu/2019mma/login/' //https://user.tjhsst.edu/2019mma/login/
        } ;
        //
        // ASYNCHRONOUSLY REQUEST A TOKEN FROM THE SERVER
        oauth2.authorizationCode.getToken(options , 
            function(error, result)
            {
                if (error) // to do... make this more graceful
                {
                    console.log(error);
                    return res.json('Authentication failed') ;
                }
                //
                // TURN THE RESULT INTO A TOKEN
                var token = oauth2.accessToken.create( result ) ;
                //
                // ATTACH THE TOKEN TO OUR COOKIE SESSION
                req.session.token = token ;
                //
                // Redirect authenticated user home
                res.redirect('https://user.tjhsst.edu/2019mma/') ; // will go back to slash
            }
        );
    }
);
//
// end of file
//
// https://stackoverflow.com/questions/18864677/what-is-process-env-port-in-node-js
// Run with sudo for ports below 1024.  These are priveleged.  Must be run as root.
/*
RFC 1060 Assigned Numbers March 1990 {Next RFC gave HTTP port 80. -Ed}
PORT NUMBERS Ports are used in the TCP [45,106] to name the ends of logical
connections which carry long term conversations.  For the purpose of
providing services to unknown callers, a service contact port is defined.
This list specifies the port used by the server process as its contact
port.  The contact port is sometimes called the "well-known port".
To the extent possible, these same port assignments are used with the
UDP [46,104].  {UDP does no error checking or re-sending of data. -Ed}
*/