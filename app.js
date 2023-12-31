const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const axios = require('axios');
const moment = require('moment-timezone')
const bodyParser = require('body-parser');

const TELEGRAM_BOT_TOKEN = '6508068400:AAGFlpYwmQ893RdKaLfGA8J2tKAjJ8fXqL4'; // Replace with your bot token
const OPENWEATHERMAP_API_KEY = 'edae2bdcbb8d14eb85ae25f70d4315dd';
const storage = {}

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));

// Sample user database (you may want to use a database in a real application)
let users = [];

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id
    bot.sendMessage(
      chatId,
      'Hello! This bot can show you the weather and time for any city. To use it, please choose an option below:',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Get Weather', callback_data: 'get_weather' }],
            [{ text: 'Get Time', callback_data: 'get_time' }],
          ],
        },
      }
    )
  });

  bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id
    const data = callbackQuery.data
  
    switch (data) {
      case 'get_weather':
        const userDataWeather = getUserData(chatId)
        userDataWeather.waitingForCity = true
        userDataWeather.waitingForWeather = true
        bot.sendMessage(chatId, 'Please enter the name of the city or send /stop to cancel:')
        break
      case 'get_time':
        const userDataTime = getUserData(chatId)
        userDataTime.waitingForCity = true
        userDataTime.waitingForTime = true
        bot.sendMessage(chatId, 'Please enter the name of the city or send /stop to cancel:')
        break
      default:
        break
    }
  });

  function getUserData(chatId) {
    let userData = storage[chatId]
    if (!userData) {
      userData = {
        waitingForCity: false,
        waitingForWeather: false,
        waitingForTime: false,
      }
      storage[chatId] = userData
    }
    return userData
  }

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id
    const text = msg.text
  
    const userData = getUserData(chatId)
    if (userData && userData.waitingForCity) {
      const city = text
      let messageText = ''
      if (userData.waitingForWeather) {
        messageText = await getWeatherData(city)
      } else if (userData.waitingForTime) {
        messageText = await getTimeData(city)
      }
      bot.sendMessage(chatId, messageText)
      resetUserData(chatId)
    }
  });

  function resetUserData(chatId) {
    const userData = getUserData(chatId)
    userData.waitingForCity = false
    userData.waitingForWeather = false
    userData.waitingForTime = false
  }

  async function getWeatherData(city) {
    const response = await axios.get(
      `http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPENWEATHERMAP_API_KEY}`
    )
    const weatherData = response.data
    const weatherDescription = weatherData.weather[0].description
    const temperature = Math.round(weatherData.main.temp - 273.15)
    const messageText = `The weather in ${city} is currently ${weatherDescription} with a temperature of ${temperature}°C.`
    return messageText
  }

  async function getTimeData(city) {
    const response = await axios.get(
      `http://api.geonames.org/timezoneJSON?formatted=true&lat=${city.lat}&lng=${city.lon}&username=demo&style=full`
    )
    const data = response.data
    const localTime = data.time
    const messageText = `The current time in ${city} is ${localTime}.`
    return messageText
  }

  