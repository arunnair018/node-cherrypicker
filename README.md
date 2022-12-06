# node-cherrypicker
a cherry-picker utility written in node


## Setup/Installations
* Install dependencies 
  * for server : ``npm install``
 * Run server (in main directory of project) ``npm start``

## API
**[POST]** /api/v1/cherry-pick
```
{
  "pr_ids" : ["<pr1>","<pr2>"],
  "envs" : ["<branch1>","<branch2>"]
}
```

## UI interface
access ui interface from `localhost/<port>/`
