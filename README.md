This is the repo for the Code Challenge API. The API is responsible for: 

- POST requests to create new useres
- POST requests to create new journal entries
- GET requests to get user data
- GET requests to get user's journal entry data
- PATCH requests to update a user's journal entry
- DELETE requests to delete a user and their data
- DELETE requests to delete a journal entry 
- In the POST and PATCH requests for journal entry data, OpenAI is used to generate mood metadata


This API is hosted on Vercel and connects to MongoDB (NoSQL database) to access the persisted data. 


