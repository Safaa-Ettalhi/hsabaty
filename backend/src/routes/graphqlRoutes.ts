import { graphqlHTTP } from 'express-graphql';
import { schema } from '../graphql/schema';
import { createRoot } from '../graphql/resolvers';
import { AuthentifieRequest } from '../middleware/authentification';


export const graphqlMiddleware = graphqlHTTP((req: unknown) => {
  const utilisateurId = (req as AuthentifieRequest).utilisateurId;
  if (!utilisateurId) {
    throw new Error('Non authentifié');
  }
  return {
    schema,
    rootValue: createRoot({ utilisateurId }),
    graphiql: process.env.NODE_ENV !== 'production'
  };
});
