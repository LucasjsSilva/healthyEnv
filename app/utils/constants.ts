export default class Constants {
  static baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://seu-dominio-api.com' 
    : 'http://localhost:5000';

  static ghCliendId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID!;
}