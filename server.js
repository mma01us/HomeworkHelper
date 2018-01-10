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
        dataObj.pageTitle = 'Homework Helper - Login';
        dataObj.loginLink  = authorizationUri;
        //
        if (typeof req.session.token != 'undefined')
        {
            // IF THE USER HAS LOGGED IN...token.token.access_token!
            res.redirect('home');
        } 
        else 
        {
            res.render('login', dataObj) ;
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
                if(error)
                {
                    console.log(error);
                    return res.redirect('https://user.tjhsst.edu/2019mma/') ;
                }
                //
                // TURN THE RESULT INTO A TOKEN
                var token = oauth2.accessToken.create( result ) ;
                //
                // ATTACH THE TOKEN TO OUR COOKIE SESSION
                req.session.token = token ;
                //
                // Redirect authenticated user home
                res.redirect('https://user.tjhsst.edu/2019mma/home') ;
            }
        );
    }
);

app.get('/home', function(req, res){
    var dataObj = {};
    dataObj.pageTitle = 'Homework Helper - Home';
    
    if (typeof req.session.token != 'undefined')
    {
        // IF THE USER HAS LOGGED IN...token.token.access_token!
        res.render('home', dataObj);
    }
    else 
    {
        res.redirect('https://user.tjhsst.edu/2019mma/');
    }
});

app.use(function(req, res, next){
  res.status(404);

  // respond with html page
  if (req.accepts('html')) {
    res.render('404', { url: req.url });
    return;
  }

  // respond with json
  if (req.accepts('json')) {
    res.send({ error: 'Not found' });
    return;
  }

  // default to plain-text. send()
  res.type('txt').send('Not found');
});