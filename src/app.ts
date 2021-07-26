import  express from 'express';
import * as dotenv from 'dotenv';
import qs from 'query-string';
import * as crypto from 'crypto';
import * as smartclient from 'smartsheet';
import path from 'path';
import cors, { CorsOptions } from 'cors';

// instantiating the Smartsheet client
const smartsheet = smartclient.createClient({
    // a blank token provides access to Smartsheet token endpoints
    accessToken: ''
});


dotenv.config();


const PORT: number = parseInt(process.env.PORT as string, 10);
if (!process.env.PORT) {
	process.exit(1);
}

const app = express();
const corsOptions: CorsOptions={
	allowedHeaders:['Content-Type','Authorization']
};

app.use(cors(corsOptions));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({extended: true}));


app.listen(PORT, () => {
	console.log(`Listening on port ${PORT}`);
});

// helper function to assemble authorization url
function authorizeURL(params) {
    const authURL = 'https://app.smartsheet.com/b/authorize';
    return `${authURL}?${qs.stringify(params)}`;
 }
 const authorizationUrl = authorizeURL({
    response_type: 'code',
    client_id: process.env.APP_CLIENT_ID,
    scope: process.env.ACCESS_SCOPE
 });
 // route redirecting to authorization page
 app.get('/auth', (req, res) => {
    return res.redirect(authorizationUrl);
 });

 app.get('/success',(req,res)=>{
     return res.send('<p>Login successful<p>');
 });

 app.get('/accessToken/:code',(req,res)=>{
     const authCode=req.params.code;
     console.log(authCode);
     const generated_hash = crypto
         .createHash('sha256')
         .update(process.env.APP_SECRET + "|" + authCode)
         .digest('hex');
     const options = {
         queryParameters: {
             client_id: process.env.APP_CLIENT_ID,
             code: authCode,
             hash: generated_hash
         }
     };
 
     smartsheet.tokens.getAccessToken(options, processToken)
         .then((token) => {
             return res.status(200).json({token});
         });
     
 });

 app.get('/callback', (req, res) => {
    const authCode = req.query.code;
    const generated_hash = crypto
        .createHash('sha256')
        .update(process.env.APP_SECRET + "|" + authCode)
        .digest('hex');
    const options = {
        queryParameters: {
            client_id: process.env.APP_CLIENT_ID,
            code: authCode,
            hash: generated_hash
        }
    };

    smartsheet.tokens.getAccessToken(options, processToken)
        .then((token) => {
            return res.redirect(`/success?accessToken=${token.access_token}&expires_in=${token.expires_in}&refreshToken=${token.refresh_token}`)
        });
    })

     const processToken=(error, token)=> {
        if (error) {
            console.error('Access Token Error:', error.message);
            return error;
        }
        console.log('The resulting token: ', token);
        // IMPORTANT: token saved to local JSON as EXAMPLE ONLY. 
        // You should save access_token, refresh_token, and expires_in to database for use in application.
//         let returned_token = {
//             "ACCESS_TOKEN": token.access_token,
//             "EXPIRES_IN": (Date.now() + (token.expires_in * 1000)),
//             "REFRESH_TOKEN": token.refresh_token
//         }
// //        fs.writeFileSync('token_priv.json', JSON.stringify(returned_token));
    
        return token;
    }