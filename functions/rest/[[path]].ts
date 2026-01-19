import { error } from 'itty-router';

export interface Env {
  BASE_URL: string
  XK: KVNamespace
  PICX: R2Bucket
  PICX_AUTH_TOKEN: string
}

export const onRequest: PagesFunction<Env> = async (context: EventContext) => {
  const { router } = await import('./router')
  // Ensure routes are registered
  await import('./routes')

  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const response: Response | undefined = await router.fetch(context.request, context.env);
    return response ?? error(404, 'not found');
  } catch (err) {
    return error(500, (err as Error).message);
  }
};
