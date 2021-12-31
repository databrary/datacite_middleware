import fetch from 'node-fetch'
import express from 'express'
import dotenv from 'dotenv'
import bodyParser from 'body-parser'

dotenv.config()

const app = express()
app.use(bodyParser.text());      // to support text/plain bodies
const port = process.env.PORT || 3000
const datacite_url = process.env.DATACITE_URL || 'https://api.datacite.org'


const encodeBase64 = (str) => {
    return Buffer.from(str).toString('base64')
}

const AuthorizarionHeader = `Basic ${encodeBase64(`${process.env.DATACITE_USERNAME}:${process.env.DATACITE_PASSWORD}`)}`

const parseTextBody = (str) => {
    const resources = str.substring(str.indexOf('<resource'), str.indexOf('</resource>') + 11)
    return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" + resources.replace(/\\"/g, '\"').replace(/\\n/g,'')
}

const buildPayload = (encodeXml, doi) => {
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

app.get('/status', async (req, res) => {
    try {
        const response =  await fetch(
            `${datacite_url}/heartbeat`,
            {
                method: 'GET',
                headers: { 'Accept': 'text/plain' }
            }
        )

        if (response.status === 200) {
            return res.status(200).send('"success" : "Datacite is up"')
        }
    } catch (error) {
        console.log('Error', error)
    }

    res.status(400).send('"error": "Datacite is down"')
})

app.post('/id/*', async (req, res) => {
    const doi = req.originalUrl.substring(4).replace(/^(doi:)/,'')
    const body = parseTextBody(req.body)

    try {
        const response = await fetch(
            `${datacite_url}/dois`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/vnd.api+json',
                    'Authorization': AuthorizarionHeader              
                },
                body: JSON.stringify(buildPayload(encodeBase64(body), doi))
            }
        )

        if (response.status === 201) {
            const result = await response.json()
            return res.status(201).send(`success : doi${doi} \n datacite : ${JSON.stringify(result)}`)
        }
        
    } catch (error) {
        console.error('Error', error)
    }

    res.status(400).send('error: "DOI NOT POSTED"')
})

app.put('/id/*', async (req, res) => {
    const doi = req.originalUrl.substring(4).replace(/^(doi:)/,'')
    const body = parseTextBody(req.body)

    try {
        const response = await fetch(
            `${datacite_url}/dois/${doi}`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/vnd.api+json',
                    'Authorization': AuthorizarionHeader              
                },
                body: JSON.stringify(buildPayload(encodeBase64(body), doi))
            }
        )

        if (response.status === 200) {
            const result = await response.json()
            return res.status(200).send(`success : doi${doi} \n datacite: ${JSON.stringify(result)}`)
        }
    } catch (error) {
        console.error('Error', error)
    }

    res.status(400).send('error: "DOI NOT UPDATED"')
})

// Catch all other requests and log them
app.get('/*', (req, res) => {
    console.log(`GET: ${req.originalUrl} - Not implemented`)
    res.status(400).send('error: "ENDPOINT NOT IMPLEMENTED"')
})

app.put('/*', (req, res) => {
    console.log(`PUT: ${req.originalUrl} - Not implemented`)
    res.status(400).send('error: "ENDPOINT NOT IMPLEMENTED"')
})

app.post('/*', (req, res) => {
    console.log(`POST: ${req.originalUrl} - Not implemented`)
    res.status(400).send('error: "ENDPOINT NOT IMPLEMENTED"')
})

app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}`)
})