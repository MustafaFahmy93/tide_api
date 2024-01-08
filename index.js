import express from "express";
import compression from "compression";
import cors from "cors";
import axios from 'axios';

import { geojsonData } from "./tideData.js";

const app = express();
const port = process.env.PORT || 3002;

app.use(cors());
app.use(compression());
app.use(express.json());

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

app.get("/", (req, res) => {
  try {
       res.json({result:"ok"});
  } catch (error) {
    console.log(error);
  }
});

app.get("/tide_data", (req, res) => {
  try {
    const maxLevel = parseInt(req.query.level_ps_r);
    if (isNaN(maxLevel)) {
      return res.status(400).send("Invalid level_ps_r value");
    }

    const filteredFeatures = geojsonData.features.filter((feature) => {
      return feature.properties.level_ps_r <= maxLevel;
    });

    const result = {
      type: "FeatureCollection",
      properties: {},
      features: filteredFeatures,
    };

    res.json(result);
  } catch (error) {
    console.log(error);
  }
});

const calculateFinalRating = (reviewCountTotals, totalReviews) => {
  // console.log(Array.isArray(reviewCountTotals),reviewCountTotals, totalReviews)
  if (!reviewCountTotals || !Array.isArray(reviewCountTotals) || reviewCountTotals.length === 0 || !totalReviews || totalReviews <= 0) {
      return "No reviews";
  }
  let weightedSum = 0;
  let totalCount = 0;

  for (const reviewCount of reviewCountTotals) {
      weightedSum += reviewCount.rating * reviewCount.count;
      totalCount += reviewCount.count;
  }

  const finalRating = totalCount > 0 ? weightedSum / totalCount : null;
  return finalRating;
}
app.get('/getRating', async (req, res) => {
  let result = {}
  try {
    console.log("pid", req.query.pid)
    const data = JSON.stringify({
      productCode: req.query.pid,
      provider: "ALL",
      count: 1,
      start: 1,
      showMachineTranslated: true,
      reviewsForNonPrimaryLocale: true,
      ratings: [1, 2, 3, 4, 5],
      sortBy: "MOST_RECENT_PER_LOCALE",
    });
    const response = await axios.post('https://api.viator.com/partner/reviews/product', data, {
      headers: {
        'Accept-Language': 'en-US',
        'Accept': 'application/json;version=2.0',
        'Content-Type': 'application/json',
        'exp-api-key': process.env.API-KEY,
      },
    });
    result = response.data;
    if(result.totalReviewsSummary){

      const rating = calculateFinalRating(result.totalReviewsSummary.reviewCountTotals,result.totalReviewsSummary.totalReviews);
      res.json({ rating });
    }else{
      res.json(result);
    }

  } catch (error) {
    res.json(error.response.data);
  }
});

app.post('/getRatings', async (req, res) => {
  try {
    const { pids } = req.body;
    console.log(pids);

    if (!pids || !Array.isArray(pids)) {
      return res.status(400).json({ error: 'Invalid product IDs' });
    }

    const ratingsObject = {};

    for (const pid of pids) {
      try {
        const data = JSON.stringify({
          productCode: pid,
          provider: 'ALL',
          count: 1,
          start: 1,
          showMachineTranslated: true,
          reviewsForNonPrimaryLocale: true,
          ratings: [1, 2, 3, 4, 5],
          sortBy: 'MOST_RECENT_PER_LOCALE',
        });

        const response = await axios.post('https://api.viator.com/partner/reviews/product', data, {
          headers: {
            'Accept-Language': 'en-US',
            'Accept': 'application/json;version=2.0',
            'Content-Type': 'application/json',
            'exp-api-key': process.env.API-KEY,
          },
        });

        const result = response.data;
        const rating = calculateFinalRating(result.totalReviewsSummary.reviewCountTotals, result.totalReviewsSummary.totalReviews);

        ratingsObject[pid] = rating;
      } catch (error) {
        console.error(`Error for product ${pid}:`, error.message);
        ratingsObject[pid] = null;
      }
    }

    res.json(ratingsObject);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


