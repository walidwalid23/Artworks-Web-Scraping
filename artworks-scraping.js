const express = require('express');
const request = require('request');
const cheerio = require('cheerio');
const app = express();

const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
    console.log("Server Listening at port: " + PORT);
});

app.get('/WalidArtworksApi', async function (req, res) {
    //request query inputs
    let artistNationality = req.query.artistNationality;
    let minPrice = 2;
    let maxPrice = 2;
    while (maxPrice <= 3) {
        // we will loop through all the pages for every min-max pairs (we increment by 200)
        let pageNumber = 1;
        let isLastPage = false;
        // loop through all pages till the end
        while (!isLastPage) {
            // we will use this array for each page then empty it
            let alreadySentPaintings = [];
            //URL
            let url = "https://www.artsy.net/collection/painting?page=" + pageNumber +
                "&artist_nationalities%5B0%5D=" + artistNationality + "&price_range=" + minPrice + "-" + maxPrice;
            // we had to turn the call back to async/await cause otherwise the loop will keep going before the reponse come
            let requestedHtml = await makeRequest(url);
            try {
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

                artworksImages.each(function (i, element) {
                    let artistName_PaintingName_Date = element.attribs.alt;
                    let paintingImageUrl = element.attribs.src;

                    // check for duplication for sending the painting
                    if (!alreadySentPaintings.includes(artistName_PaintingName_Date)) {
                        // send the stream holding object of painting data here
                        console.log(artistName_PaintingName_Date);
                        // add the paintaing to already sent paintings
                        alreadySentPaintings.push(artistName_PaintingName_Date);

                    }

                });
                console.log(alreadySentPaintings.length);


            }
            catch (error) {
                console.log(error);
            }


        }
        //increment the min and max prices since all the pages have finished
        minPrice += 200;
        maxPrice += 200;
    }
    console.log("search has ended");
});


function makeRequest(url) {
    return new Promise(function (resolve, reject) {
        // The callback function takes 3 parameters, an error, response status code and the html
        request(url, function (error, res, html) {
            if (!error && res.statusCode === 200) {
                resolve(html);
            } else {
                reject(error);
            }
        });
    });
}



app.get("/trystream", function (req, res) {
    console.log("here");
    for (var i = 0; i < 5; i++) {


        res.write("welo: " + i);


    }
    res.end();
})

