
const fs = require('fs');
const express = require("express");
const bodyParser = require("body-parser");
const hbs = require("hbs");
const  MongoClient = require("mongodb").MongoClient;
const objectId = require("mongodb").ObjectID;
var port = 3030;


const app = express();
const urlencodedParser = bodyParser.urlencoded({ extended: false });
const mongoClient = new MongoClient("mongodb://localhost:27017/", { useUnifiedTopology: true });

let dbClient;
app.use(express.static(__dirname + "/public"));
mongoClient.connect(function(err, client) {
    if(err)
        return console.log(err);
    dbClient = client;
    app.locals.collection = client.db("problemsdb").collection("problems");
    app.locals.collectionExecutors = client.db("problemsdb").collection("Executors");
    app.listen(port, function() {
        console.log("Сервер ожидает подключения");
    });
});

hbs.registerHelper("getTable", function(array) {
    let result = "<table border=1>";
    result += "<tr><th>ID</th><th>ФИО</th><th>Телефон</th><th>Описание проблемы</th><th>Решена?</th><th>Исполнитель</th><th>Комментарий</th></tr>"
    for(let i = 0; i < array.length; i++) {
        let tmp;
        if(array[i].completed)
            tmp = "Да";
        else
            tmp = "Нет";
        result += "<tr><td>" + array[i]._id+"</td><td>"
                             + array[i].userName + "</td><td>" 
                             + array[i].phone + "</td><td>" 
                             + array[i].problem + "</td><td>" 
                             + tmp + "</td><td>"
                             + array[i].executor + "</td><td>" 
                             + array[i].comment +"</td><tr>";
    }
    result += "</table>"
    return new hbs.SafeString(result);
});

hbs.registerHelper("getExecutors", function(array) {
    let result;
    let tmp;
    if(array.value != undefined)
        tmp = array.value;
    for(let i = 0; i < array.length; i++) {
        if(tmp != undefined && array[i].executor == array.value)
            result += "<option selected>" + array[i].executor + "</option>";
        else
            result+="<option>" + array[i].executor + "</option>";
    }
    return new hbs.SafeString(result);
});

app.set("view engine", "hbs");

app.get('/', function(request, response) {
    console.log("get main request");
    response.status(200).sendFile("index.html");
});

// ~~~client~~~

app.get('/client', function(request, response) {
    console.log("get /client request");
    response.render("client.hbs");
});

app.post('/client', urlencodedParser, function(request, response) {
    console.log("post /client request");
    if(!request.body)
        return response.sendStatus(400);
    let feedback = {
        userName: request.body.userName, 
        phone: request.body.phone, 
        problem: request.body.problem, 
        completed: false, 
        executor:"не назначен",
        comment: "-",
    };
    const collection = request.app.locals.collection;
    
    collection.insertOne(feedback, function(err, result) {
        if(err)
            return console.log(err);
        console.log("insert feedback in database");
        console.log(feedback);
    });
    response.render("client.hbs");
})

app.post('/client/table', urlencodedParser, function(request, response) {
    console.log("post /client/table request");
    const collection = request.app.locals.collection;
    if(request.body.userName === '') {
        collection.find({}).toArray(function(err, problems) {
            tmp = problems;
            if(err)
                return console.log(err);
            response.render("client.hbs", {
                visible: true,
                table: problems
            });
        });
    } else {
        collection.find({userName: request.body.userName}).toArray(function(err, problems) {
            if(err)
                return console.log(err);
            response.render("client.hbs", {
                visible: true,
                table: problems
            });
        });
    }
});

// ~~~/client~~~


// ~~~supervisor~~~

app.get('/supervisor', function(request, response) {
    console.log("get /supervisor request");
    const collection = request.app.locals.collection;
    const collectionExecutors = request.app.locals.collectionExecutors;
    collection.find({}).toArray(function(err, problems) {
        collectionExecutors.find({}).toArray(function(err, executor) {
            response.render("supervisor.hbs", {
                executors: executor,
                table: problems
            });
        });
    });
});

app.post('/supervisor/addExecutor', urlencodedParser, function(request, response) {
    console.log("post /supervisor/addExecutor request");
    const collection = request.app.locals.collection;
    const collectionExecutors = request.app.locals.collectionExecutors;
    let addexecutor = {
        executor: request.body.executor
    }
    collectionExecutors.insertOne(addexecutor, function(err, result) {
        if(err)
            return console.log(err);
        console.log("insert executor in database");
        console.log(addexecutor);
        collection.find({}).toArray(function(err, problems) {
            collectionExecutors.find({}).toArray(function(err, executor) {
                response.render("supervisor.hbs", {
                    executors: executor,
                    table: problems
                });
            });
        });
    });
});

app.post('/supervisor/changeExecutor', urlencodedParser, function(request, response) {
    console.log("post /supervisor/changeExecutor request");
    const collection = request.app.locals.collection;
    const collectionExecutors = request.app.locals.collectionExecutors;
    let id = new objectId(request.body.id);
    collection.findOneAndUpdate({_id: id}, {$set: {executor: request.body.executor}}, function(err, result) {
        if(err)
            return console.log(err);
        console.log(result);
        collection.find({}).toArray(function(err, problems) {
            if(err)
                return console.log(err);
            collectionExecutors.find({}).toArray(function(err, executor) {
                if(err)
                    return console.log(err);
                response.render("supervisor.hbs", {
                    executors: executor,
                    table: problems
                });
            });
        });
    });
});

// ~~~/supervisor~~~


// ~~~executor~~~

app.get('/chooseexecutor', function(request, response) {
    console.log("get /chooseexecutor request");
    const collectionExecutors = request.app.locals.collectionExecutors;
    collectionExecutors.find({}).toArray(function(err, executor) {
        response.render("chooseexecutor.hbs", {
            visible: false,
            executors: executor
        });
    });
})

app.post('/chooseexecutor', urlencodedParser, function(request, response) {
    console.log("post /chooseexecutor request");
    const collection = request.app.locals.collection;
    collection.find({executor: request.body.executor}).toArray(function(err, problems) {
            response.render("executor.hbs", {
                executor: request.body.executor,
                table: problems
            });
        });
});

app.post('/chooseexecutor/executor',  urlencodedParser, function(request, response) {
    console.log("post /chooseexecutor/executor request");
    console.log(request.body);
    const collection = request.app.locals.collection;
    let ready;
    if(request.body.ready === "yes")
        ready = true;
    else
        ready = false;
    let comm = request.body.comment;
    if(comm == undefined)
    comm = "-";
    let id;
    if(request.body.id != '')
        id = new objectId(request.body.id);
    collection.findOneAndUpdate({_id: id, executor: request.body.executor}, {$set: {comment: request.body.comment, completed:ready}}, function(err, result) {
        if(err)
            return console.log(err);
        console.log(result);
        collection.find({executor: request.body.executor}).toArray(function(err, problems) {
            if(err)
                return console.log(err);
            response.render("executor.hbs", {
                executor: request.body.executor,
                table: problems
            });
        });
    });
});

// ~~~/executor~~~

process.on("SIGINT", () => {
    dbClient.close();
    process.exit();
})