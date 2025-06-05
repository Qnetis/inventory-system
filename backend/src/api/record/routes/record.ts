import { factories } from '@strapi/strapi';
import customRoutes from './custom-routes';

const defaultRouter = factories.createCoreRouter('api::record.record');

const defaultRoutes =
  typeof defaultRouter.routes === 'function' ? defaultRouter.routes() : defaultRouter.routes;

export default {
  routes: [
    ...defaultRoutes,
    ...customRoutes.routes,
  ],
};
