"use strict";

const fs = require("fs");
const jenkins = require("jenkins");

/////////////////////////////////////////////////////////////////////////////////////////////////

let jenkinsClient = null;

/////////////////////////////////////////////////////////////////////////////////////////////////

function connectToJenkins(){
    const data = fs.readFileSync("jenkins_pass.json");
    const jenkinsCredentials = JSON.parse(data);

    jenkinsClient = jenkins({
        baseUrl: `http://${jenkinsCredentials.user}:${jenkinsCredentials.pass}@jenkins.17btest.com:8080/`,
        //crumbIssuer?: boolean;
        //headers?: any;
        promisify: true,
    });
}

async function renderJenkinsInfo(req, res){
    const info = await jenkinsClient.info();
    const jobs = info["jobs"].map((jobData)=>{
        return jobData.name;
    });

    res.render("jenkins_info", {
        jobs: jobs
    });
}

async function getJenkinsInfoForTarget(req, res){
    const targetName = req.params.target;
    
    const result = await jenkinsClient.job.get(targetName);
    console.log(result);

    // отправляем пользователя
    if(result){
        res.send(result);
    }else{
        res.status(404).send();
    }
}

function setupHttp(httpApp){
    // Rendering
    httpApp.get("/jenkins_info", renderJenkinsInfo);

    // RestAPI for Jenkins
    httpApp.get("/api/jenkins/:target", getJenkinsInfoForTarget);
}

/////////////////////////////////////////////////////////////////////////////////////////////////

module.exports = {
    connectToJenkins: connectToJenkins,
    setupHttp: setupHttp
};