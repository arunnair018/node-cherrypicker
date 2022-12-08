# node-cherrypicker
a cherry-picker utility written in node


## Setup/Installations
* Install dependencies ``npm install``
* create `env` file
* Run server ``npm start``

## UI interface
UI interface will be hosted @ `localhost/<port>/`

## API (for postman use)
**[POST]** /api/v1/cherry-pick
```
{
  "pr_ids" : ["<pr1>","<pr2>"],
  "envs" : ["<branch1>","<branch2>"]
}
```

## Note
Please run this server with extra clone of desired repo, as it will checkout and do git action on the provided branch. if performed on you current working clone, you might lose your current changes.
