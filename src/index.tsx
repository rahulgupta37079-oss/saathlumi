import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'
import { api } from './api'

const app = new Hono()
app.use('*', async (c, next) => {
 c.header('X-Content-Type-Options', 'nosniff')
 c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
 c.header('X-Frame-Options', 'DENY')
 c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
 c.header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'")
 await next()
})
app.route('/api', api)
app.use('/static/*', serveStatic({ root: './public' }))
const shell = `<!DOCTYPE html>
<html lang="en-IN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="theme-color" content="#fdfbf7"><title>Saathlumi — Good company. Meaningful moments.</title><meta name="description" content="A little good company goes a long way. Explore Saathlumi, an adults-only community for platonic coffee, conversations, and shared experiences in India. Preview mode."><meta name="robots" content="noindex, nofollow"><meta property="og:title" content="Saathlumi — Good company. Meaningful moments."><meta property="og:description" content="Find your kind of company. Strictly platonic, always respectful. Explore the Saathlumi preview."><link rel="icon" href="/static/favicon.svg" type="image/svg+xml"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="/static/style.css"><script src="/static/app.js" defer></script></head><body><a class="skip-link" href="#app">Skip to content</a><div id="app" tabindex="-1"></div><noscript><main><h1>Saathlumi</h1><p>Good company. Meaningful moments.</p><p>Please enable JavaScript to explore our adults-only, strictly platonic companion-booking preview. Payments and live bookings are not available.</p></main></noscript><dialog id="app-dialog" aria-label="Saathlumi booking preview"></dialog><div id="toast" role="status" aria-live="polite"></div></body></html>`
const routes = ['/', '/browse', '/how-it-works', '/safety', '/pricing', '/register', '/login', '/forgot-password', '/reset-password', '/verify-email', '/dashboard', '/onboarding', '/calendar', '/availability', '/messages', '/checkout', '/payment-result', '/contact', '/terms', '/privacy', '/refunds', '/guidelines', '/admin']
for (const route of routes) app.get(route, c => c.html(shell))
app.get('/companions/:id', c => c.html(shell, ['ananya', 'arjun', 'meera'].includes(c.req.param('id')) ? 200 : 404))
app.get('/robots.txt', c => c.text('User-agent: *\nDisallow: /\n'))
app.notFound(c => c.html(shell, 404))
export default app
