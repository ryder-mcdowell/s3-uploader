var inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
var AWS = require('aws-sdk');
var s3 = new AWS.S3();

const askForFilePath = async() => {
  return inquirer
  .prompt([{
    type: 'input',
    name: 'filePath',
    message: 'Enter file path to upload:'
  }])
  .then(answers => {
    return answers.filePath
  });
}

const uploadFile = async(filePath) => {
  console.log('reading...')
  fs.readFile(filePath, function(err, data) {
    if (err) throw err;
    
    const fileName = path.basename(filePath);

    console.log('uploading...')
    s3.upload({
      Key: fileName,
      Bucket: 'testy-tester-351541531532',
      Body: data,
      ACL: 'private'
    }, function (err, data) {
      if (err) throw err;
      console.log('file uploaded!');
    })
  });
}

const run = async() => {
  const filePath = await askForFilePath();
  await uploadFile(filePath);
}

run();