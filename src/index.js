const express = require('express')
const dotenv = require('dotenv')
const bodyParser = require('body-parser')
const fetch = require('node-fetch')

dotenv.config()

const app = express()
app.use(bodyParser.text());      // to support text/plain bodies
const port = process.env.PORT || 3000
const datacite_url = process.env.DATACITE_URL || 'https://api.datacite.org'


const encodeBase64 = function (str) {
    return Buffer.from(str).toString('base64')
}

const AuthorizarionHeader = "Basic " + encodeBase64(process.env.DATACITE_USERNAME + ":" + process.env.DATACITE_PASSWORD)

const parseTextBody = function (str) {
    const resources = str.substring(str.indexOf('<resource'), str.indexOf('</resource>') + 11)
    return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" + resources.replace(/\\"/g, '\"').replace(/\\n/g,'')
}

const buildPayload = function (encodeXml, doi) {
    return { 
        data: {
            id: doi,
            type: "dois",
            attributes: {
                event: "publish",
                doi: doi,
                url: "https://schema.datacite.org/meta/kernel-3/index.html",
                xml: encodeXml
            }
        }
    }
}

app.get('/status', function (req, res) {
    console.log('REQUEST GET: /status')
    return fetch(
        datacite_url + "/heartbeat",
        {
            method: 'GET',
            headers: { 'Accept': 'text/plain' }
        }
    ).then((response) => {
        if (response.status === 200) {
            return res.status(200).send('"success" : "Datacite is up"')
        }
    }).catch((error) => {
        console.error('GET: /status Error', error)
        return res.status(400).send('"error": "Datacite is down"')
    })
})

app.post('/id/*', function (req, res) {
    const doi = req.originalUrl.substring(4).replace(/^(doi:)/,'')
    const body = parseTextBody(req.body)

    console.log("REQUEST POST: /id/doi:" + doi)
    return fetch(
        datacite_url + "/dois",
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/vnd.api+json',
                'Authorization': AuthorizarionHeader              
            },
            body: JSON.stringify(buildPayload(encodeBase64(body), doi))
        }
    ).then((response) => {
        if (response.status === 201) {
            return response.json().then((data) => {
                return res.status(201).send("success : doi:" + doi + " \n " + "datacite : " + JSON.stringify(data))
            })   
        }
    }).catch((error) => {
        console.error("POST: /id/doi:" + doi + "Error", error)
        return res.status(400).send('error: "DOI NOT POSTED"')
    })    
})

app.put('/id/*', function (req, res) {
    const doi = req.originalUrl.substring(4).replace(/^(doi:)/,'')
    const body = parseTextBody(req.body)
    
    console.log("REQUEST PUT: /id/doi:" + doi)
    return fetch(
        datacite_url + "/dois/" + doi,
        {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/vnd.api+json',
                'Authorization': AuthorizarionHeader              
            },
            body: JSON.stringify(buildPayload(encodeBase64(body), doi))
        }
    ).then((response) => {
        if (response.status === 200) {
            return response.json().then((data) => {
                return res.status(200).send("success : doi:" + doi + " \n " + "datacite : " + JSON.stringify(data))
            })
        }
    }).catch((error) => {
        console.error("PUT: /id/doi:" + doi + "Error", error)
        return res.status(400).send('error: "DOI NOT UPDATED"')
    })  
})

// Catch all other requests and log them
app.get('/*', (req, res) => {
    console.log("GET: " + req.originalUrl + " - Not implemented")
    res.status(400).send('error: "ENDPOINT NOT IMPLEMENTED"')
})

app.put('/*', (req, res) => {
    console.log("PUT: " + req.originalUrl + " - Not implemented")
    res.status(400).send('error: "ENDPOINT NOT IMPLEMENTED"')
})

app.post('/*', (req, res) => {
    console.log("POST: " + req.originalUrl + " - Not implemented")
    res.status(400).send('error: "ENDPOINT NOT IMPLEMENTED"')
})

app.listen(port, () => {
    console.log("Listening at http://localhost:" + port)
})