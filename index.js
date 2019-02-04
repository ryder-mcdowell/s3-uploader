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

const askForFile = async() => {
  return inquirer
  .prompt([
    {
      type: 'input',
      name: 'filePath',
      message: 'Enter file path to upload:'
    },
    {
      type: 'input',
      name: 'name',
      message: 'Enter name of upload:'
    }
  ])
  .then(answers => {
    return { path: answers.filePath, name: answers.name }
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

const uploadArtist = async(artistFile) => {
  console.log('creating artist...');
  s3.putObject({
    Bucket: 'testy-tester-351541531532',
    Key: artistFile.name + '/'
  }, function(err, data) {
    if (err) throw err;

    console.log('reading artist contents...');
    fs.readdir(artistFile.path, async function(err, albums) {
      if (err) throw err;

      if (!albums || albums.length === 0) {
        console.log('created empty artist!');
        return;
      } else {
        console.log('uploading artist contents...');
        for (const albumName of albums.filter(junk.not)) {
          let albumFile = { path: path.join(artistFile.path, albumName), name: albumName };
          await uploadAlbum(albumFile, artistFile.name + '/');
        }
        console.log('artist uploaded!');
      }
    })
  });
}

const uploadAlbum = async(albumFile, parentArtist) => {
  console.log('creating album...');
  s3.putObject({
    Bucket: 'testy-tester-351541531532',
    Key: parentArtist + albumFile.name + '/'
  }, function(err, data) {
    if (err) throw err;

    console.log('reading album contents...');
    fs.readdir(albumFile.path, async function(err, songs) {
      if (err) throw err;

      if (!songs || songs.length === 0) {
        console.log('created empty album!');
        return;
      } else {
        console.log('uploading album contents...');
        for (const songName of songs.filter(junk.not)) {
          let songFile = { path: path.join(albumFile.path, songName), name: songName}
          await uploadSong(songFile, parentArtist, albumFile.name + '/');
        }
        console.log('album uploaded!');
      }
    });
  });
}

const uploadSong = async(songFile, parentArtist, parentAlbum) => {
  console.log('reading song...');
  fs.readFile(songFile.path, function(err, data) {
    if (err) throw err;

    console.log('uploading song...');
    s3.upload({
      Key: parentArtist + parentAlbum + songFile.name,
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
        const songFile = await askForFile();
        await uploadSong(songFile, parentArtist, parentAlbum);
      }
    }
  } else if (uploadType === ALBUM_UPLOAD_TYPE) {
    const artists = await getArtists();
    if (artists) {
      const parentArtist = await askForParentArtist(artists);
      const albumFile = await askForFile();
      await uploadAlbum(albumFile, parentArtist);
    }
  } else {
    const artistFile = await askForFile();
    await uploadArtist(artistFile);
  }
}

run();