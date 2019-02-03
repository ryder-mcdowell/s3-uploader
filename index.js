var inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
var AWS = require('aws-sdk');
var s3 = new AWS.S3();

const ALBUM_UPLOAD_TYPE = 'album';
const SONG_UPLOAD_TYPE = 'song';

const askForUploadType = async() => {
  return inquirer
  .prompt([{
    type: 'list',
    name: 'uploadType',
    message: 'Pick an upload type:',
    choices: [
      ALBUM_UPLOAD_TYPE,
      SONG_UPLOAD_TYPE
    ]
  }])
  .then(answers => {
    return answers.uploadType
  })
}

const askForParentAlbum = async(albums) => {
  return inquirer
  .prompt([{
    type: 'list',
    name: 'parentAlbum',
    message: 'Pick album to upload to:',
    choices: albums
  }])
  .then(answers => {
    return answers.parentAlbum
  });
}

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

const getAlbums = async() => {
  return s3.listObjects({
    Bucket: 'testy-tester-351541531532',
    Delimiter: '/'
  }).promise()
  .then(data => {
    return data.CommonPrefixes.map(album => album.Prefix);
  })
  .catch(err => {
    console.log(err.message);
  });
}

const uploadAlbum = async(albumPath) => {
  console.log('creating album...');
  const albumName = path.basename(albumPath);
  s3.putObject({
    Bucket: 'testy-tester-351541531532',
    Key: albumName + '/'
  }, function(err, data) {
    if (err) throw err;

    console.log('reading album contents...');
    fs.readdir(albumPath, function(err, files) {
      if (err) throw err;

      if (!files || files.length === 0) {
        console.log('created empty album!');
        return;
      } else {
        console.log('uploading album contents');
        for (const songName of files) {
          fs.readFile(path.join(albumPath, songName), function(err, data) {
            if (err) throw err;
        
            s3.upload({
              Key: songName,
              Bucket: 'testy-tester-351541531532/' + albumName,
              Body: data,
              ACL: 'private'
            }, function (err, data) {
              if (err) throw err;
            })
          });
        }
        console.log('album uploaded!');
      }
    });
  });
}

const uploadSong = async(songPath, parentAlbum) => {
  console.log('reading song...');
  fs.readFile(songPath, function(err, data) {
    if (err) throw err;
    
    const songName = path.basename(songPath);

    console.log('uploading song...');
    s3.upload({
      Key: parentAlbum + songName,
      Bucket: 'testy-tester-351541531532',
      Body: data,
      ACL: 'private'
    }, function (err, data) {
      if (err) throw err;
      console.log('song uploaded!');
    });
  });
}

const run = async() => {
  const uploadType = await askForUploadType();
  if (uploadType === SONG_UPLOAD_TYPE) {
    const albums = await getAlbums();
    if (albums) {
      const parentAlbum = await askForParentAlbum(albums);
      const songPath = await askForFilePath();
      await uploadSong(songPath, parentAlbum);
    }
  } else {
    const albumPath = await askForFilePath();
    await uploadAlbum(albumPath);
  }
}

run();