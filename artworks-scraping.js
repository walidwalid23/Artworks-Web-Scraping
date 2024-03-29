const express = require('express');
const request = require('requestretry');
const cheerio = require('cheerio');
const app = express();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Server Listening at port: " + PORT);
});

app.get('/WalidArtworksApi', async function (req, res) {

    //request query inputs
    let artist_nationalities = req.query.artistNationality;
    let materials_terms = req.query.materials_terms;
    let major_periods = req.query.major_periods;
    console.log("Artworks Web Scraper Received Request")
    let minPrice = 1;
    let maxPrice = 200;
    let lastArtwork = null

    let queries = ''
    let queriesCount = 0

    if (artist_nationalities) {
        queries += 'artist_nationalities%5B0%5D=' + artist_nationalities
        queriesCount += 1
    }

    if (materials_terms) {
        if (queriesCount > 0) {
            queries += "&"
        }
        queries += 'materials_terms%5B0%5D=' + materials_terms
        queriesCount += 1
    }

    if (major_periods) {
        if (queriesCount > 0) {
            queries += "&"
        }
        queries += 'major_periods%5B0%5D=' + major_periods
        queriesCount += 1
    }




    while (maxPrice <= 60000) {
        // we will loop through all the pages for every min-max pairs (we increment by 200)
        let pageNumber = 1;
        let isLastPage = false;
        // loop through all pages till the end
        while (!isLastPage) {
            // we will use this array for each page then empty it
            let alreadySentPaintings = [];
            //URL
            let url = "https://www.artsy.net/collection/painting?page=" + pageNumber +
                "&" + queries + "&price_range=" + minPrice + "-" + maxPrice;
            // we had to turn the call back to async/await cause otherwise the loop will keep going before the reponse come
            console.log(url)
            try {
                let requestedHtml = await makeRequest(url);
                // Next, we'll utilize the cheerio library on the returned html which will essentially give us jQuery functionality
                var $ = cheerio.load(requestedHtml, { scriptingEnabled: false });
                // check if this is the last page or not
                var nav = $('.Box-sc-15se88d-0.Text-sc-18gcpao-0.ibHUpM.ifZlmE');
                // if this is the last page the aTag will be null (no <a>) remember to add .html()
                var aTagNextClass = nav.find('.Link-oxrwcw-0.dSuxVr');
                //console.log(aTagNextClass.html());
                if (!aTagNextClass.html()) {
                    isLastPage = true;
                    console.log("this is the last page");

                }
                else {
                    // if its not the last page increment the pages
                    pageNumber++;
                }
                // We'll be using Cheerio's function to single out the necessary information using JQUERY
                // using DOM selectors which are normally found in CSS.
                var artworksDiv = $('.ArtworkGrid-uextjn-0');
                // console.log(artworksDiv.html());
                // the images comes tripled so we must check for duplication
                var artworksImages = artworksDiv.find('img');

                if (maxPrice == 60000 && isLastPage) {
                    // get last artwork in the nationality to send it to client server to close connection when it reach it
                    lastArtwork = artworksImages.last().attr('alt');
                }
                // iterate over each artworks image element
                artworksImages.each(function (index, element) {
                    let artistName_PaintingName_Date = element.attribs.alt;
                    let artworkImageUrl = element.attribs.src;

                    // check for duplication for sending the painting
                    if (!alreadySentPaintings.includes(artistName_PaintingName_Date)) {

                        // send the stream holding object of painting data here
                        console.log(artistName_PaintingName_Date)
                        res.write(JSON.stringify({
                            "artworkDetails": artistName_PaintingName_Date,
                            "artworkImageUrl": artworkImageUrl,
                            "lastArtwork": lastArtwork,
                            'maxPrice': maxPrice
                        }) + '\n');

                        // add the paintaing to already sent paintings
                        alreadySentPaintings.push(artistName_PaintingName_Date);

                    }

                });
                console.log("number of paintings in this page:" + alreadySentPaintings.length);


            }
            catch (error) {
                console.log(error);
            }


        }
        //increment the min and max prices since all the pages have finished
        minPrice += 200;
        maxPrice += 200;
        console.log(maxPrice);
    }
    req.on("close", function () {
        // THE PROBLEM IS THAT THE WEB SCRAPER IS FASTER THAN THE PROCESSING CLIENT SERVER SO IT FINISHES THEN ENDS THE STREAM
        // BEFORE THE CLIENT SERVER CONSUME ALL THE STREAM THEN IT WAIT FOR TIME OUT THEN CLOSES CONNECTION AND GIVE ERROR ON
        // CLIENT SERVER SIDE
        // Don't end the stream before client consumes all the stream because this will cancel the connection with the client server only after the first nationality
        // instead pass a boolean to client server when stream finish and end connection from there
        console.log("client has closed the connection so end the stream");
        res.end();
    });
    console.log("search has ended");


});


function makeRequest(url) {
    return new Promise(function (resolve, reject) {
        // The callback function takes 3 parameters, an error, response status code and the html
        // WAIT FOR RANDOM NUMBER OF SECONDS FROM 1 TO 10 SECS BETWEEN EACH REQUEST TO AVOID ANTI SCRAPERS
        setTimeout(() => {
            request({
                url: url,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.75 Safari/537.36'
                },
                // The below parameters are specific to request-retry
                maxAttempts: 5,   // (default) try 5 times
                retryDelay: 5000,  // (default) wait for 5s before trying again
                retryStrategy: request.RetryStrategies.HTTPOrNetworkError // (default) retry on 5xx or network errors
            }, function (error, res, html) {
                if (!error && res.statusCode === 200) {
                    resolve(html);
                } else {
                    console.log("Error: " + error)
                    console.log("Status Code: " + res.statusCode)
                    reject(error);
                }
            });
        }, Math.floor(Math.random() * 10000) + 1);



    });
}





