// Proxy endpoint pour rediriger /api/* vers le gateway
// Fonctionne en production (Docker) en détectant automatiquement le gateway

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Détecter l'URL du gateway selon l'environnement
// Utilise le nom de service (gateway) qui fonctionne à la fois avec Docker Compose et Docker Swarm
const GATEWAY_URL = process.env.PUBLIC_GATEWAY_URL || 'http://gateway:80';

export const GET: RequestHandler = async ({ params, url, request }) => {
	return proxyRequest('GET', params.path, url, request);
};

export const POST: RequestHandler = async ({ params, url, request }) => {
	return proxyRequest('POST', params.path, url, request);
};

export const PUT: RequestHandler = async ({ params, url, request }) => {
	return proxyRequest('PUT', params.path, url, request);
};

export const DELETE: RequestHandler = async ({ params, url, request }) => {
	return proxyRequest('DELETE', params.path, url, request);
};

async function proxyRequest(
	method: string,
	path: string,
	url: URL,
	request: Request
): Promise<Response> {
	try {
		// Construire l'URL cible
		const targetUrl = `${GATEWAY_URL}/${path}${url.search}`;

		console.log(`[Proxy] ${method} /api/${path} → ${targetUrl}`);

		// Copier les headers (sauf host)
		const headers = new Headers();
		request.headers.forEach((value, key) => {
			if (key.toLowerCase() !== 'host') {
				headers.set(key, value);
			}
		});

		// Préparer la requête
		const init: RequestInit = {
			method,
			headers
		};

		// Ajouter le body pour POST/PUT
		if (method === 'POST' || method === 'PUT') {
			init.body = await request.text();
		}

		// Envoyer la requête au gateway
		const response = await fetch(targetUrl, init);

		// Retourner la réponse
		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers: response.headers
		});
	} catch (err: any) {
		console.error('[Proxy] Error:', err.message);
		throw error(502, {
			message: 'Gateway unavailable',
			details: err.message
		});
	}
}
