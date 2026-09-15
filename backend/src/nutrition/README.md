# Deterministic Nutrition Calculation

The calculator uses the Mifflin-St Jeor equation for basal energy requirement:

- Male: `10 x kg + 6.25 x cm - 5 x age + 5`
- Female: `10 x kg + 6.25 x cm - 5 x age - 161`
- Non-binary or undisclosed sex: midpoint constant `-78`

Estimated daily energy expenditure is basal energy multiplied by a physical activity level (PAL): sedentary `1.20`, lightly active `1.375`, moderately active `1.55`, or very active `1.725`. When no activity level is supplied, weekly selected training minutes deterministically select that same table: under 90, 90-179, 180-299, or 300+ minutes.

Goal adjustments are conservative: `+200 kcal` for muscle building, `-300 kcal` for fat loss, and `0 kcal` for maintenance. Protein is `1.6 g/kg` for muscle building with at least three training days (`1.4 g/kg` otherwise), `1.5 g/kg` for fat loss, and `1.2 g/kg` for maintenance. Fat is the larger of `0.8 g/kg` and 20% of calorie target. Carbohydrate fills remaining calories after protein and fat. Fiber is `14 g` per 1,000 estimated calories.

All outputs are estimated starting values. The service returns no calorie or macro targets for users under 18 or when medical nutrition support is indicated; it directs those users to an appropriate qualified professional.