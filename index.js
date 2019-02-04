var inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const junk = require('junk');
var AWS = require('aws-sdk');
var s3 = new AWS.S3();

const ARTIST_UPLOAD_TYPE = 'artist';
const ALBUM_UPLOAD_TYPE = 'album';
const SONG_UPLOAD_TYPE = 'song';

const askForUploadType = async() => {
  return inquirer
  .prompt([{
    type: 'list',
    name: 'uploadType',
    message: 'Pick an upload type:',
    choices: [
      ARTIST_UPLOAD_TYPE,
      ALBUM_UPLOAD_TYPE,
      SONG_UPLOAD_TYPE
    ]
  }])
  .then(answers => {
    return answers.uploadType
  })
}

const askForParentArtist = async(artists) => {
  return inquirer
  .prompt([{
    type: 'list',
    name: 'parentArtist',
    message: 'Pick artist to upload to:',
    choices: artists
  }])
  .then(answers => {
    return answers.parentArtist
  });
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

const getArtists = async() => {
  return s3.listObjects({
    Bucket: 'testy-tester-351541531532',
    Delimiter: '/'
  }).promise()
  .then(data => {
    return data.CommonPrefixes.map(artist => artist.Prefix);
  })
  .catch(err => {
    console.log(err.message);
  });
}

const getAlbums = async(artist) => {
  return s3.listObjects({
    Bucket: 'testy-tester-351541531532',
    Delimiter: '/',
    Prefix: artist
  }).promise()
  .then(data => {
    return data.CommonPrefixes.map(album => album.Prefix.split('/')[1] + '/');
  })
  .catch(err => {
    console.log(err.message);
  });
}

const uploadArtist = async(artistPath) => {
  console.log('creating artist...');
  const artistName = path.basename(artistPath);
  s3.putObject({
    Bucket: 'testy-tester-351541531532',
    Key: artistName + '/'
  }, function(err, data) {
    if (err) throw err;

    console.log('reading artist contents...');
    fs.readdir(artistPath, async function(err, albums) {
      if (err) throw err;

      if (!albums || albums.length === 0) {
        console.log('created empty artist!');
        return;
      } else {
        console.log('uploading artist contents...');
        for (const albumName of albums.filter(junk.not)) {
          await uploadAlbum(artistPath + '/' + albumName, artistName + '/');
        }
      }
    })
    console.log('artist uploaded!');
  });
}

const uploadAlbum = async(albumPath, parentArtist) => {
  console.log('creating album...');
  const albumName = path.basename(albumPath);
  s3.putObject({
    Bucket: 'testy-tester-351541531532',
    Key: parentArtist + albumName + '/'
  }, function(err, data) {
    if (err) throw err;

    console.log('reading album contents...');
    fs.readdir(albumPath, function(err, songs) {
      if (err) throw err;

      if (!songs || songs.length === 0) {
        console.log('created empty album!');
        return;
      } else {
        console.log('uploading album contents...');
        for (const songName of songs.filter(junk.not)) {
          fs.readFile(path.join(albumPath, songName), function(err, data) {
            if (err) throw err;
        
            s3.upload({
              Key: songName,
              Bucket: 'testy-tester-351541531532/' + parentArtist + albumName,
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

const uploadSong = async(songPath, parentArtist, parentAlbum) => {
  console.log('reading song...');
  fs.readFile(songPath, function(err, data) {
    if (err) throw err;
    
    const songName = path.basename(songPath);

    console.log('uploading song...');
    s3.upload({
      Key: parentArtist + parentAlbum + songName,
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
    const artists = await getArtists();
    if (artists) {
      const parentArtist = await askForParentArtist(artists)
      const albums = await getAlbums(parentArtist);
      if (albums) {
        const parentAlbum = await askForParentAlbum(albums);
        const songPath = await askForFilePath();
        await uploadSong(songPath, parentArtist, parentAlbum);
      }
    }
  } else if (uploadType === ALBUM_UPLOAD_TYPE) {
    const artists = await getArtists();
    if (artists) {
      const parentArtist = await askForParentArtist(artists);
      const albumPath = await askForFilePath();
      await uploadAlbum(albumPath, parentArtist);
    }
  } else {
    const artistPath = await askForFilePath();
    await uploadArtist(artistPath);
  }
}

run();