# Iran IT Gadget Store — Sales Observatory

[![Validate & publish dashboard](https://github.com/tpootth/iran-it-gadget-store-sales/actions/workflows/pages.yml/badge.svg)](https://github.com/tpootth/iran-it-gadget-store-sales/actions/workflows/pages.yml)

**[Open the interactive dashboard](https://tpootth.github.io/iran-it-gadget-store-sales/)**

An interactive business analytics portfolio presenting monthly sales trends, category contribution, city and product leaderboards, order outcomes, and customer segments.

## Explore

- Monthly sales in source units or indexed to the first month
- City rankings by sales or completed-order count
- Category contribution and product leaders
- Completed-order KPIs and all-order status mix
- Customer segment profiles and proposed business experiments

## Data and methods

Source: [E-Commerce Sales Data Analysis and EDA on Kaggle](https://www.kaggle.com/datasets/erfan4524/e-commerce-sales-data-analysis-and-eda/data).

The source analysis contains 49,222 order records, of which 45,276 are Completed. Completed sales total 3,162,844 source units. Sales are summed from the supplied Sales field. Currency and whether the dataset is real or synthetic are unconfirmed. The existing customer clustering output supplies segment shares for its analysis cohort. These descriptive results do not establish causal promotion effects or profit.

This public repository contains aggregate dashboard data only. Row-level customer/order records and source notebooks remain outside this public release. No new license is assigned to third-party data.

## Run locally

```sh
python3 -m http.server 8000 --directory dashboard
```

Open http://localhost:8000. The dashboard uses native HTML, CSS, JavaScript and SVG, with no runtime third-party libraries or analytics trackers.

## Deployment

GitHub Actions checks JavaScript syntax and JSON validity and deploys the dashboard to GitHub Pages on every push to main. The published aggregate dataset is a snapshot; the workflow does not re-run the original notebooks or refresh source data.
