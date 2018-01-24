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
var http = require('http');
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var path = require('path');
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

function createTodoElement(name, details){
    return `<div class='card todo' draggable='true'>
        <div class="card-header">
            <h1>` + name + `</h1>
        </div>
        <div class="card-body">
            <p>` + details + `</p>
        </div>
    </div>\n`;
}
//
app.get('/',
    function(req, res)
    {
        var context = {} ;
        //
        context.pageTitle = 'Login';
        context.loginLink  = authorizationUri;
        //
        if (typeof req.session.token != 'undefined')
        {
            // IF THE USER HAS LOGGED IN...token.token.access_token!
            res.redirect('home');
        } 
        else 
        {
            res.render('login', context) ;
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
                req.session.token = token;
                //
                // Redirect authenticated user home
                res.redirect('https://user.tjhsst.edu/2019mma/home') ;
            }
        );
    }
);

app.get('/home', function(req, res){
    var context = {};
    context.pageTitle = 'Home';
    
    if (typeof req.session.token != 'undefined')
    {
        // IF THE USER HAS LOGGED IN...token.token.access_token!
        var access_token = req.session.token.token.access_token;
        // ASK ION FOR THE USER NAME...and other information
        request.get(
            {
                url : irl + 'api/profile?format=json&access_token='+access_token
            } , 
            function( error , result , body )
            {
                var resObj = JSON.parse( body );
                //
                context.name = resObj['short_name'];
                context.username = resObj['ion_username'];
                context.email = resObj['tj_email'];
                context.first = resObj['first_name'];
                context.last = resObj['last_name'];
                
                var con = mysql.createConnection({
                    host: "mysql1.csl.tjhsst.edu",
                    user: "site_2019mma",
                    password: "NqsmYJHHN7rbwwFvchT3SzXz",
                    database : "site_2019mma",
                    multipleStatements: true
                });
                
                con.connect(function(err) {
                    if (err) throw err;
                    console.log("Connected to SQL!");
                    //default user creation
                    con.query(`INSERT INTO users (fname, lname, tutorial, email, username) SELECT * FROM 
                    (SELECT '` + context.name + `', '` + context.last + `', 1,'` + context.email + `', '` + context.username + `') 
                    AS tempvals WHERE NOT EXISTS (SELECT username FROM users WHERE username = '` + context.username + `') LIMIT 1;`, function (err, result) {
                        if (err) throw err;
                        
                        con.query("SELECT id FROM users WHERE username='" + context.username +"' LIMIT 1;", function(err, result){
                            if(err)
                                throw err;
                            context.userid = result[0].id;
                            
                            con.query("SELECT * FROM todo WHERE userid=" + context.userid + " AND done=0;", function(err, result){
                                context.todos = [];
                                if(err)
                                    throw err;
                                try{
                                    console.log(result);
                                    for(var r in Object.keys(result)){
                                        context.todos.push({
                                            id: result[r].id,
                                            title: result[r].name,
                                            details: result[r].description
                                        });
                                    }
                                }
                                catch (err){
                                    console.log(err);
                                }
                                console.log(context.todos);
                                res.render('home', context);
                            });
                        });
                    });
                });
            }
        );
    }
    else 
    {
        res.redirect('https://user.tjhsst.edu/2019mma/');
    }
});

app.get('/signout', function(req, res){
    if (typeof req.session.token != 'undefined')
    {
        req.session.token = undefined;
        
        res.redirect('https://user.tjhsst.edu/2019mma/');
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

io.on('connection',function(socket){
    console.log("Connection made with server");
    
    socket.on('create_todo', function(data){
        console.log("Todo created with data: ");
        console.log(data);
        var con = mysql.createConnection({
                host: "mysql1.csl.tjhsst.edu",
                user: "site_2019mma",
                password: "NqsmYJHHN7rbwwFvchT3SzXz",
                database : "site_2019mma",
                multipleStatements: true
            });
                
        con.connect(function(err) {
            if (err) throw err;
            con.query(`INSERT INTO todo (name, description, userid) VALUES('` + data.name + 
            `', '` + data.details + `', '` + data.userid + `');`, function (err, result) {
                if (err) throw err;
            });
        });
    });
    
    socket.on('finish_todo', function(data){
        console.log("Todo created with data: ");
        console.log(data);
        var con = mysql.createConnection({
                host: "mysql1.csl.tjhsst.edu",
                user: "site_2019mma",
                password: "NqsmYJHHN7rbwwFvchT3SzXz",
                database : "site_2019mma",
                multipleStatements: true
            });
                
        con.connect(function(err) {
            if (err) throw err;
            con.query(`UPDATE todo SET done = 1 WHERE id=` + data + `;`, function (err, result) {
                if (err) throw err;
                console.log("Finished");
            });
        });
    });
    
    socket.on('delete_todo', function(data){
        console.log("Deleted todo with data: ");
        console.log(data);
        var con = mysql.createConnection({
                host: "mysql1.csl.tjhsst.edu",
                user: "site_2019mma",
                password: "NqsmYJHHN7rbwwFvchT3SzXz",
                database : "site_2019mma",
                multipleStatements: true
            });
                
        con.connect(function(err) {
            if (err) throw err;
            con.query(`DELETE FROM todo WHERE id=` + data + `;`, function (err, result) {
                if (err) throw err;
                console.log("Deleted");
            });
        });
    });
});