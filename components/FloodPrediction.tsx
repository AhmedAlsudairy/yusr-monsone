'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Cloud, Droplets, AlertTriangle } from 'lucide-react'
import { MonitoringData, ForecastResult, WeatherData, BadgeVariant } from '@/types/monitoring'

interface FloodPredictionProps {
  latitude: number
  longitude: number
  currentData: MonitoringData | null
}

export function FloodPrediction({ latitude, longitude, currentData }: FloodPredictionProps) {
  const [predictionData, setPredictionData] = useState<ForecastResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Gemini API key from your provided value
  const GEMINI_API_KEY = 'AIzaSyAODQWrYmmnTHa0fpyxleTsf-OiWWlTvr8'

  const fetchWeatherData = async (): Promise<WeatherData> => {
    try {
      // Replace with your actual weather API call
      // This is a placeholder using OpenWeatherMap API as an example
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${process.env.NEXT_PUBLIC_WEATHER_API_KEY}&units=metric`
      )
      
      if (!response.ok) {
        throw new Error('Weather API request failed')
      }
      
      const data = await response.json()
      return data as WeatherData
    } catch (error) {
      console.error('Failed to fetch weather data:', error)
      throw error
    }
  }

  const generatePrediction = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // First, get weather forecast data
      let weatherApiData: WeatherData | null = null
      
      try {
        weatherApiData = await fetchWeatherData()
      } catch {
        // If weather API fails, use mock data for demonstration
        console.log('Using mock weather data for demonstration')
        weatherApiData = {
          list: [
            {
              dt_txt: new Date().toISOString(),
              main: { temp: 25, humidity: 85 },
              weather: [{ main: 'Rain', description: 'heavy rain' }],
              rain: { '3h': 20.5 }
            }
          ]
        }
      }
      
      // Format the weather data and current monitoring data as input for Gemini
      const forecastSummary = weatherApiData?.list?.slice(0, 5).map((item) => ({
        time: item.dt_txt,
        temperature: item.main.temp,
        humidity: item.main.humidity,
        conditions: item.weather[0].main,
        description: item.weather[0].description,
        precipitation: item.rain ? item.rain['3h'] : 0
      }))
      
      const prompt = `
        I need a flood risk assessment and prediction based on the following data:
        
        Current monitoring data:
        - Water level: ${currentData?.water_level || 'N/A'}
        - Current water status: ${currentData?.water_status || 'N/A'}
        - Temperature: ${currentData?.temperature ? `${currentData.temperature}°C` : 'N/A'}
        - Humidity: ${currentData?.humidity ? `${currentData.humidity}%` : 'N/A'}
        - Location: ${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E
        
        Weather forecast data:
        ${JSON.stringify(forecastSummary, null, 2)}
        
        Please provide:
        1. A specific flood risk assessment (LOW, MODERATE, HIGH, or CRITICAL)
        2. A short explanation (under 100 words)
        3. Time estimate until potential flooding if risk is HIGH or CRITICAL
        4. Recommended actions
        
        Format the response as JSON with fields: riskLevel, explanation, timeEstimate, recommendedActions
      `
      
      // Call Gemini API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }]
            }]
          })
        }
      )
      
      if (!response.ok) {
        throw new Error('Failed to get prediction from Gemini API')
      }
      
      const result = await response.json()
      
      // Extract the text from Gemini response and parse as JSON
      const predictionText = result.candidates[0].content.parts[0].text
      
      // Extract JSON portion from the response if it contains markdown formatting
      const jsonMatch = predictionText.match(/```json\n([\s\S]*?)\n```/) || 
                       predictionText.match(/```\n([\s\S]*?)\n```/) ||
                       [null, predictionText]
      
      const jsonStr = jsonMatch[1] || predictionText
      
      // Parse the JSON response
      const predictionJson = JSON.parse(jsonStr) as ForecastResult
      setPredictionData(predictionJson)
    } catch (error) {
      console.error('Error generating prediction:', error)
      setError('Failed to generate flood prediction. Please try again later.')
      
      // Use mock data for demonstration if the API fails
      setPredictionData({
        riskLevel: "HIGH",
        explanation: "Based on current water levels and expected heavy rainfall (20.5mm in next 3h), there's a high risk of flooding. The ground saturation is already high, and additional precipitation will likely cause runoff issues.",
        timeEstimate: "6-8 hours",
        recommendedActions: ["Close flood gates", "Activate emergency response teams", "Alert residents in low-lying areas", "Monitor water levels continuously"]
      })
    } finally {
      setLoading(false)
    }
  }

  const getRiskBadgeColor = (level: string): BadgeVariant => {
    switch (level?.toUpperCase()) {
      case 'CRITICAL': return 'destructive'
      case 'HIGH': return 'destructive'
      case 'MODERATE': return 'secondary'
      case 'LOW': return 'default'
      default: return 'secondary'
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">🤖 AI Flood Prediction</h2>
          {predictionData && (
            <Badge variant={getRiskBadgeColor(predictionData.riskLevel)}>
              {predictionData.riskLevel} RISK
            </Badge>
          )}
        </div>
        
        {!predictionData && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-6">
            <div className="flex items-center justify-center mb-4">
              <Cloud className="w-12 h-12 text-blue-400 mr-2" />
              <Droplets className="w-12 h-12 text-blue-600" />
            </div>
            <p className="text-center text-slate-600 mb-4">
              Generate an AI-powered flood prediction based on current monitoring data and weather forecasts.
            </p>
            <Button onClick={generatePrediction}>
              Generate Prediction
            </Button>
          </div>
        )}
        
        {loading && (
          <div className="flex flex-col items-center justify-center py-6">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-slate-600">Analyzing data and generating prediction...</p>
          </div>
        )}
        
        {error && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={generatePrediction}>Try Again</Button>
          </div>
        )}
        
        {predictionData && !loading && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-slate-50">
              <p className="text-slate-700">{predictionData.explanation}</p>
            </div>
            
            {(predictionData.riskLevel === 'HIGH' || predictionData.riskLevel === 'CRITICAL') && 
             predictionData.timeEstimate && (
              <div className="flex items-center">
                <div className="w-1/3">
                  <p className="font-medium text-slate-700">Estimated Time:</p>
                </div>
                <div className="w-2/3">
                  <p className="font-bold text-red-600">{predictionData.timeEstimate}</p>
                </div>
              </div>
            )}
            
            <div>
              <p className="font-medium text-slate-700 mb-2">Recommended Actions:</p>
              <ul className="list-disc pl-5 space-y-1">
                {predictionData.recommendedActions.map((action: string, i: number) => (
                  <li key={i} className="text-slate-600">{action}</li>
                ))}
              </ul>
            </div>
            
            <div className="pt-4 flex justify-end">
              <Button variant="outline" onClick={generatePrediction} className="text-sm">
                Refresh Prediction
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}