<p align="center">
  <img src="https://i.imgur.com/SDQILZf.png" alt="Logo"/>
</p>

# ServerManager (Beta) - Easy way to manage all your servers!
Small project to manage all my Minecraft servers. It runs on node server and automatically creates all servers from config. Many things are very specific for my needs, so you'll need to change them if you would use it.

## Setup
- Install all needed packages:
```
npm install
```

## Server setup
- All servers are located in root subfolder named "server"
- You need to specify .jar file in config.json eg:
```javascript
"filename": "spigot.jar" // This means that the file is located in ./server/SERVERNAME/spigot.jar
```
- Then add all required specs to the config.json and run the server!

## Starting node server
- Run the node server:
```
node server.js
```
Now you can find the running server on:
```
localhost:3000
```

***

<div class='parent' align="center">
  <div class='child' style="display: inline-block">
    <a href="https://www.vojtech-adam.cz/privacy" target="_blank">Privacy</a>
  </div>
</div>
