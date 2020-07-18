const fs = require("fs")
const express = require("express")
const bodyParser = require("body-parser")
const utils = require('./utils')

const jwt = require("jsonwebtoken")
const {
	randomString,
	containsAll,
	decodeAuthCredentials,
	timeout,
} = require("./utils")

const config = {
	port: 9001,
	privateKey: fs.readFileSync("assets/private_key.pem"),

	clientId: "my-client",
	clientSecret: "zETqHgl0d7ThysUqPnaFuLOmG1E=",
	redirectUri: "http://localhost:9000/callback",

	authorizationEndpoint: "http://localhost:9001/authorize",
}

const clients = {
	"my-client": {
		name: "Sample Client",
		clientSecret: "zETqHgl0d7ThysUqPnaFuLOmG1E=",
		scopes: ["permission:name", "permission:date_of_birth"],
	},
	"test-client": {
		name: "Test Client",
		clientSecret: "TestSecret",
		scopes: ["permission:name"],
	},
}

const users = {
	user1: "password1",
	john: "appleseed",
}

const requests = {}
const authorizationCodes = {}

let state = ""

const app = express()
app.set("view engine", "ejs")
app.set("views", "assets/authorization-server")
app.use(timeout)
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

/*
Your code here
*/
const pasw = utils.randomString();
app.get('/authorize',(req,res)=>{
	const client = clients[req.query.client_id];
	
	if(clients.hasOwnProperty(req.query.client_id) && utils.containsAll(client.scopes,req.query.scope.split(" "))) //&& ( arr.includes("permission:name") || arr.includes("permission:date_of_birth")))
	{
		const requestId = utils.randomString();
		requests[requestId] = req.query
		res.status(200).render("login",{client, scope: req.query.scope,requestId})
	}
	else{
		res.status(401).end()
	}
	
})

app.post('/approve',(req,res)=>{

	const {userName,password,requestId} = req.body;
	const clientReq = requests[requestId];
	if(!userName || users[userName] !=password || !requests[requestId])
	{
		res.status(401).send('erroe');
		return
	}
	else {
		delete requests[requestId];
		const rndStr = utils.randomString();
		authorizationCodes[rndStr] = {clientReq, userName};
		const myURL = new URL(clientReq.redirect_uri);
		myURL.searchParams.set('code',rndStr)
		myURL.searchParams.set('state',clientReq.state)
		res.status(200).redirect(myURL);
	}
	
   
})


app.post('/token',(req,res)=>{
	if(!req.headers.authorization)
	    res.status(401).send('erroe');

	const { clientId, clientSecret } = utils.decodeAuthCredentials(req.headers.authorization);
	const client = clients[clientId];
	if(!client || client.clientSecret != clientSecret)
		res.status(401).send('erroe');
	const code = req.body.code
	if(!code || !authorizationCodes[code])
	res.status(401).send('erroe');
	
	const {clientReq,userName } = authorizationCodes[code];
	delete authorizationCodes[code];

	const token = jwt.sign({userName,scope:clientReq.scope}, config.privateKey,{algorithm:"RS256",expiresIn:300,issuer:"http://localhost:"+config.port});

	res.status(200).send({access_token: token, token_type:"Bearer"});


})

const server = app.listen(config.port, "localhost", function () {
	var host = server.address().address
	var port = server.address().port
})

// for testing purposes

module.exports = { app, requests, authorizationCodes, server }
