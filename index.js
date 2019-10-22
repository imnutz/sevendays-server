var csv = require("csvtojson");

var express = require("express"),
    app = express();

var PORT = 3000,
    CSV_FILE = "./stock_data.csv",
    STOCK_PERIOD = 7;

var stockData = {},
    names = [];

function processData(data) {
    data.forEach(function(stock) {
        var name = stock.name;

        if (!stockData[name]) {
            stockData[name] = {
                sorted: false,
                data: [stock]
            };

            names.push(name);
        } else {
            stockData[name].data.push(stock);
        }
    });
}

function toDays(millis) {
    return millis / 1000 / 60 / 60 / 24;
}

function formatDate(date) {
    var day = date.getDate(),
        month = date.getMonth() + 1,
        year = date.getFullYear();

    var dayStr = day < 10 ? ("0" + day) : String(day);
        monthStr = month < 10 ? ("0" + month) : String(month);

    return year + "-" + monthStr + "-" + dayStr;
}

function fillMissingData(currentData = []) {
    var results = [],
        dataSize = currentData.length,
        i,
        j;
    var diff = 0;

    for (i = 0; i < dataSize; i++) {
        var data1 = currentData[i],
            data2 = currentData[i + 1];

        var date1 = new Date(data1.date),
            date2;

        results.push(data1);

        if (data2) {
            date2 = new Date(data2.date);

            diff = toDays(date2 - date1);

            if (diff > 1) {
                for (j = 0; j < diff - 1; j++) {
                    date1.setDate(date1.getDate() + 1);
                    results.push({
                        date: formatDate(new Date(date1.getTime())),
                        name: data1.name,
                        value: 0
                    });
                }
            }
        }
    }

    return results;
}

function compare(stock1, stock2) {
    var date1 = new Date(stock1.date),
        date2 = new Date(stock2.date);

    return date1 - date2;
}

function getStocksBySegment(data, segment) {
    var dataSize = data.length,
        results = [],
        index,
        start = segment * STOCK_PERIOD,
        end = start + STOCK_PERIOD;

    if (start >= dataSize) return [];

    if (end > dataSize) end = dataSize;

    for (index = start; index < end; index++) {
        results.push(data[index]);
    }

    return results;
}

function startServer() {
    app.listen(PORT, function(err) {
        if (err) {
            return console.log("Failed to start server", err);
        }

        console.log("Server is listening at: ", PORT);
    });
}

// allow cross origin
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
    );
    next();
});

// routing
app.get("/stocks", function(request, response) {
    response.send({
        names: names
    });
});

app.get("/stocks/:name/:segment", function(request, response) {
    var name = request.params.name,
        segment = request.params.segment,
        stock;
    var result;

    if (!name) {
        return response.status(400).send("Name of stock must be specified!");
    }

    stock = stockData[name];
    if (!stock) {
        return response
            .status(404)
            .send("Couldn't find the stock with name " + name);
    }

    if (!stock.sorted) {
        stock.data = fillMissingData(stock.data.sort(compare));
        stock.sorted = true;
    }

    segment = segment - 1;

    result = getStocksBySegment(stock.data, segment || 0);
    response.send(result);
});

// load data
csv()
    .fromFile(CSV_FILE)
    .then(processData)
    .then(startServer);
