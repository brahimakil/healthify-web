Data Model Organization
Here is a structured breakdown of the collections you provided.

1. users Collection
Stores core user account details and their detailed fitness profile.

userId (string) - Document ID / Primary Key

createdAt (timestamp) - The date and time the user account was created.

displayName (string) - The user's public display name.

email (string) - The user's unique email address for login.

photoURL (string) - A URL to the user's profile picture.

role (string) - The user's role in the system (e.g., "user", "admin").

updatedAt (timestamp) - The date and time the user profile was last updated.

profile (map) - A nested object containing the user's detailed health and fitness information.

activityLevel (string) - The user's self-reported activity level (e.g., "active").

age (number) - The user's age in years.

currentWeight (number) - The user's current weight (unit unspecified, likely kg).

dailyCalorieTarget (number) - The user's calculated daily calorie goal.

dailyWaterTarget (number) - The user's daily water intake goal in ml.

gender (string) - The user's gender (e.g., "male", "female").

googleApiKey (string) - An API key, likely for a Google service.

healthGoals (string) - The primary health objective (e.g., "Build Muscle").

height (number) - The user's height in cm.

name (string) - The user's full name.

sleepDurationTarget (number) - The user's target sleep duration in hours.

weeklyWorkoutTarget (number) - The target number of workouts per week.

2. daily_nutrition_goals Collection
Stores the calculated macronutrient and calorie goals for a specific user on a specific date. This is likely generated based on the user's profile.

goalId (string) - Document ID / Primary Key

userId (string) - A reference to the users collection.

date (string) - The specific date for which these goals apply (e.g., "2025-06-13").

calorieGoal (number) - Total target calories for the day.

carbsGoal (number) - Target carbohydrates in grams for the day.

fatGoal (number) - Target fat in grams for the day.

proteinGoal (number) - Target protein in grams for the day.

createdAt (timestamp) - When this daily goal entry was created.

updatedAt (timestamp) - When this daily goal entry was last updated.

targetMeals (map) - The suggested number of meals for the day.

breakfast (number)

dinner (number)

lunch (number)

snacks (number)

3. meal_entries Collection
Records every meal or food item a user consumes on a given day.

mealEntryId (string) - Document ID / Primary Key

userId (string) - A reference to the users collection.

mealType (string) - The type of meal (e.g., "breakfast", "lunch", "dinner", "snacks").

quantity (number) - The amount of the serving unit consumed (e.g., 100).

servings (number) - The number of servings consumed.

consumedAt (timestamp) - The exact date and time the meal was eaten.

createdAt (timestamp) - When the meal entry was logged in the app.

actualNutrition (map) - The calculated nutritional value for the consumed portion.

calories (number)

carbs (number)

fat (number)

protein (number)

foodItem (map) - A snapshot of the food item that was consumed. This can be from the food_items collection or an API.

id (string) - The unique identifier of the food item.

name (string) - The name of the food.

description (string) - A description of the food.

brand (string) - The brand of the food (e.g., "AI Suggestion", "User Created").

isCustom (boolean) - true if this was a user-created food item.

nutritionPer100g (map) - The base nutritional information for a standard serving.

servingSize (number)

servingUnit (string)

calories (number)

carbs (number)

fat (number)

protein (number)

4. food_items Collection
A library of food items, including both custom user-created foods and pre-populated items from external sources/APIs.

foodId (string) - Document ID / Primary Key

userId (string) - A reference to the users collection (for custom items).

name (string) - The name of the food.

description (string) - A description of the food.

brand (string) - The brand or source of the food item.

isCustom (boolean) - true if this was created by a user.

createdAt (timestamp) - When the food item was added to the library.

updatedAt (timestamp) - When the food item was last updated.

nutritionPer100g (map) - The base nutritional information.

servingSize (number)

servingUnit (string)

calories (number)

carbs (number)

fat (number)

protein (number)

fiber (number)

sodium (number)

sugar (number)

5. waterEntries Collection
Logs each instance of water or other fluid consumption by a user.

waterEntryId (string) - Document ID / Primary Key

userId (string) - A reference to the users collection.

amount (number) - The amount of water consumed, likely in ml.

date (string) - The date of consumption (e.g., "2025-06-04").

drinkType (string) - The type of drink (e.g., "water").

note (string) - Any additional notes.

timeConsumed (timestamp) - The exact time of consumption.

createdAt (timestamp) - When the entry was logged.

updatedAt (timestamp) - When the entry was last updated.

6. SleepEntries Collection
Logs individual sleep sessions for a user.

sleepEntryId (string) - Document ID / Primary Key

userId (string) - A reference to the users collection.

date (string) - The primary date associated with the sleep session (e.g., "2025-06-05").

bedtime (timestamp) - The time the user went to bed.

wakeTime (timestamp) - The time the user woke up.

sleepDuration (number) - Total duration of sleep, likely in minutes (e.g., 810 minutes = 13.5 hours).

sleepQuality (number) - A user's subjective rating of sleep quality (e.g., 1-5).

createdAt (timestamp) - When the entry was logged.

updatedAt (timestamp) - When the entry was last updated.

7. workoutPlans Collection
Stores user-defined or suggested workout routines for specific days of the week.

planId (string) - Document ID / Primary Key

userId (string) - A reference to the users collection.

planName (string) - The name of the workout plan (e.g., "Wednesday Workout").

dayOfWeek (string) - The day this plan is for (e.g., "Wednesday").

estimatedDuration (number) - Estimated total workout time in minutes.

createdAt (timestamp) - When the plan was created.

updatedAt (timestamp) - When the plan was last updated.

targetMuscleGroups (array of strings) - The main muscle groups targeted by this plan.

Example: ["upper arms", "back"]

exercises (array of maps) - A list of exercises included in the plan.

exerciseId (string) - A unique ID for the exercise within the plan.

exerciseName (string) - The name of the exercise.

sets (number) - The number of sets to perform.

reps (number) - The number of repetitions per set.

weight (number) - The weight to be used (unit unspecified, likely kg or lbs).

restTime (number) - Rest time in seconds between sets.

completed (boolean) - true if this specific exercise was completed.

completedAt (timestamp) - When the exercise was marked as completed.

8. workouts Collection
Logs individual, ad-hoc completed exercises that may not be part of a structured workoutPlan. This could include workouts from an API or manually logged activities.

workoutId (string) - Document ID / Primary Key

userId (string) - A reference to the users collection.

exerciseName (string) - The name of the exercise performed.

caloriesBurned (number) - Estimated calories burned during the activity.

duration (number) - The duration of the activity in minutes.

difficulty (string) - The difficulty level (e.g., "beginner").

muscle (string) - The primary muscle group worked.

weight (number) - Weight used, if applicable.

notes (string) - Any user notes about the workout.

completedAt (timestamp) - When the workout was completed.

9. hydrationGoals Collection
A lookup table containing pre-defined daily water intake targets based on a user's health goal and other factors.

goalId (string) - Document ID / Primary Key

userId (string) - A reference to the users collection.

healthGoal (string) - The goal this target is for (e.g., "Improve Fitness", "Build Muscle").

activityLevel (string) - The activity level this target is for.

basedOnWeight (number) - The weight used as a basis for the calculation.

dailyTarget (number) - The resulting daily water intake goal in ml.

createdAt (timestamp) - When the goal template was created.

updatedAt (timestamp) - When the goal template was last updated.