var inquirer = require('inquirer');

const ask = async() => {
  return inquirer
  .prompt([{
    type: 'input',
    name: 'question',
    message: 'Please enter your name:'
  }])
  .then(answers => {
    console.log(answers)
  });
}

const run = async() => {
  await ask();
}

run();