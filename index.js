import express from "express";
import compression from "compression";
import cors from "cors";
import { geojsonData } from "./tideData.js";

const app = express();
const port = 3001;

app.use(cors());
app.use(compression());
app.use(express.json());

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
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
