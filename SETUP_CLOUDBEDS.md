# Cloudbeds API Setup - Quick Guide

## Problem: Data nahi aa raha

Agar aapko "Not authenticated" error aa raha hai, toh yeh steps follow karein:

## Step 1: `.env` File Mein Credentials Add Karein

`backend/.env` file open karein aur yeh lines add karein:

```env
CLOUDBEDS_CLIENT_ID=live1_148933527322816_MyfZ0OGSNU2wDnkCAHsxFRPI
CLOUDBEDS_CLIENT_SECRET=BqFQZH5cTk3ASrvlGX1bC02oetnyfaI9
CLOUDBEDS_API_KEY=cbat_88aTL4zFff00gkZ3L1m0IuJ0oBDfnR43
CLOUDBEDS_HOTEL_SLUG=your_hotel_slug
```

**Important**: 
- `.env` file `backend` folder mein honi chahiye
- Har line pe `=` ke baad space nahi hona chahiye
- Quotes (`"` ya `'`) use mat karein values mein

## Step 2: Backend Server Restart Karein

```bash
# Terminal mein
cd backend
npm start
```

Ya agar already running hai, toh:
1. Server stop karein (Ctrl+C)
2. Phir se start karein: `npm start`

## Step 3: Test Karein

Browser mein ya Postman mein:
```
GET http://localhost:5000/api/cloudbeds/status
```

Expected response:
```json
{
  "success": true,
  "data": {
    "connected": true,
    "hotelName": "Your Hotel Name",
    "message": "Successfully connected to Cloudbeds API"
  }
}
```

## Agar Abhi Bhi Error Aaye

### Error: "Not authenticated"
- `.env` file check karein - credentials sahi hain ya nahi
- Backend server restart kiya hai ya nahi
- Console logs check karein - kya error aa raha hai

### Error: "Failed to connect"
- Internet connection check karein
- Cloudbeds API server accessible hai ya nahi
- API key valid hai ya nahi (Cloudbeds dashboard se verify karein)

### Debug Steps:
1. Backend console mein logs check karein
2. `.env` file verify karein
3. API key format check karein (should start with `cbat_`)
4. Server restart karein

## Quick Test Command

PowerShell mein:
```powershell
cd backend
Get-Content .env | Select-String "CLOUDBEDS"
```

Yeh command aapko dikhayega ki credentials properly set hain ya nahi.
