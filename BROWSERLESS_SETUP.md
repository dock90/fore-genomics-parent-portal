# Browserless.io Setup for PDF Generation

## Overview

This project now uses [browserless.io](https://browserless.io) for serverless PDF generation in production environments. This replaces the previous approach of trying to run Puppeteer directly on Vercel's serverless functions, which was unreliable and often failed.

## Benefits

- **Reliable PDF generation** in serverless environments
- **No cold start issues** with Puppeteer
- **Scalable** - handles multiple concurrent PDF generation requests
- **Cost-effective** - pay per use pricing model
- **Professional support** and monitoring

## Setup Steps

### 1. Get Browserless.io Account

1. Visit [browserless.io](https://browserless.io)
2. Sign up for an account
3. Choose a plan (Free tier available for testing)
4. Get your API token from the dashboard

### 2. Environment Variables

Add these environment variables to your `.env.local` and production environment:

```bash
# Required: Your browserless.io API token
BROWSERLESS_TOKEN=your_api_token_here

# Optional: Custom browserless.io URL (defaults to https://chrome.browserless.io)
BROWSERLESS_URL=https://chrome.browserless.io
```

### 3. Vercel Environment Variables

For production deployment, add these to your Vercel project:

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add:
   - `BROWSERLESS_TOKEN` = your browserless.io API token
   - `BROWSERLESS_URL` = https://chrome.browserless.io (optional)

### 4. Test the Setup

1. Deploy to staging with the environment variables
2. Visit `/test-browserless-pdf` to test PDF generation
3. Verify that PDFs are generated successfully

## How It Works

### Architecture

```
User Request → Next.js API Route → BrowserlessPDFService → browserless.io → PDF Buffer → User
```

### Fallback Strategy

The system uses a tiered approach:

1. **Production/Staging**: Uses browserless.io (primary)
2. **Local Development**: Uses local Puppeteer if available
3. **Fallback**: Uses alternative PDF generation method if both fail

### Code Structure

- `src/lib/browserless-pdf-service.ts` - Main browserless.io service
- `src/lib/consent-pdf-service.ts` - Updated to use browserless as primary method
- `src/app/api/test-browserless-pdf/route.ts` - Test endpoint
- `src/app/test-browserless-pdf/page.tsx` - Test page

## Testing

### Local Testing

1. Set `BROWSERLESS_TOKEN` in your `.env.local`
2. Run `npm run dev`
3. Visit `/test-browserless-pdf`
4. Click "Generate Test PDF"

### Production Testing

1. Deploy to staging with environment variables
2. Test the same endpoint
3. Verify PDF generation works
4. Monitor browserless.io dashboard for usage

## Monitoring

### Browserless.io Dashboard

- Monitor API usage and costs
- View request logs and errors
- Check performance metrics

### Application Logs

The service logs:
- When browserless.io is used
- Any fallbacks to alternative methods
- Errors and their details

## Troubleshooting

### Common Issues

1. **"BROWSERLESS_TOKEN not set"**
   - Check environment variables are set correctly
   - Verify token is valid in browserless.io dashboard

2. **"Failed to connect to browserless.io"**
   - Check network connectivity
   - Verify BROWSERLESS_URL is correct
   - Check if browserless.io service is down

3. **PDF generation fails**
   - Check browserless.io dashboard for errors
   - Verify HTML content is valid
   - Check browserless.io plan limits

### Debug Mode

Enable debug logging by setting:

```bash
DEBUG=browserless:*
```

## Cost Considerations

### Browserless.io Pricing

- **Free tier**: Limited requests per month
- **Paid plans**: Pay per request
- **Enterprise**: Custom pricing for high volume

### Optimization Tips

1. **Cache PDFs** when possible to avoid regeneration
2. **Batch requests** if generating multiple PDFs
3. **Monitor usage** to optimize costs

## Migration from Previous System

### What Changed

1. **Primary method**: Now uses browserless.io instead of local Puppeteer
2. **Fallback**: Maintains existing fallback methods for reliability
3. **Configuration**: Requires new environment variables

### Rollback Plan

If issues arise:

1. Remove `BROWSERLESS_TOKEN` environment variable
2. System will automatically fall back to previous methods
3. No code changes required

## Security Considerations

1. **API Token**: Keep your browserless.io token secure
2. **Rate Limiting**: Browserless.io provides built-in rate limiting
3. **Content Validation**: Validate HTML content before sending to browserless.io

## Support

- **Browserless.io**: [Support Documentation](https://docs.browserless.io/)
- **Project Issues**: Create GitHub issues for project-specific problems
- **Community**: Check browserless.io community forums
