var og=Object.defineProperty;var _e=(e,n)=>{for(var i in n)og(e,i,{get:n[i],enumerable:!0})};var d={};_e(d,{$brand:()=>bo,$input:()=>Fc,$output:()=>Mc,INVALID:()=>ee,NEVER:()=>yo,TimePrecision:()=>tu,ZodAny:()=>Bs,ZodArray:()=>Ks,ZodBase64:()=>Fi,ZodBase64URL:()=>Ji,ZodBigInt:()=>Mt,ZodBigIntFormat:()=>Gi,ZodBoolean:()=>Bt,ZodCIDRv4:()=>Bi,ZodCIDRv6:()=>Mi,ZodCUID:()=>Ai,ZodCUID2:()=>Ui,ZodCatch:()=>fl,ZodCodec:()=>Vn,ZodCompileAsyncError:()=>me,ZodCompileUnsupportedError:()=>D,ZodCreditCard:()=>Ts,ZodCustom:()=>Bn,ZodCustomStringFormat:()=>it,ZodDate:()=>An,ZodDefault:()=>cl,ZodDiscriminatedUnion:()=>Gs,ZodE164:()=>Ki,ZodEmail:()=>Ni,ZodEmoji:()=>Di,ZodEnum:()=>Zt,ZodError:()=>_b,ZodExactOptional:()=>Yi,ZodFile:()=>rl,ZodFirstPartyTypeKind:()=>zl,ZodFunction:()=>xl,ZodGUID:()=>Ei,ZodIBAN:()=>As,ZodIPv4:()=>Ri,ZodIPv6:()=>Vi,ZodISODate:()=>Le,ZodISODateTime:()=>Ue,ZodISODuration:()=>Ze,ZodISOTime:()=>Ce,ZodInstanceOf:()=>Sl,ZodIntersection:()=>Xs,ZodIssueCode:()=>wb,ZodJWT:()=>Wi,ZodKSUID:()=>Zi,ZodLazy:()=>$l,ZodLiteral:()=>nl,ZodMAC:()=>Ds,ZodMap:()=>el,ZodNaN:()=>gl,ZodNanoID:()=>Ti,ZodNever:()=>Fs,ZodNonOptional:()=>Qi,ZodNull:()=>Rs,ZodNullable:()=>al,ZodNumber:()=>Vt,ZodNumberFormat:()=>ot,ZodObject:()=>Ln,ZodOptional:()=>Zn,ZodPipe:()=>Rn,ZodPrefault:()=>sl,ZodPreprocess:()=>vl,ZodPromise:()=>kl,ZodReadonly:()=>hl,ZodRealError:()=>ce,ZodRecord:()=>Ct,ZodSet:()=>tl,ZodString:()=>Rt,ZodStringFormat:()=>Z,ZodSuccess:()=>pl,ZodSymbol:()=>Cs,ZodTemplateLiteral:()=>bl,ZodTransform:()=>il,ZodTuple:()=>Hs,ZodType:()=>N,ZodULID:()=>Li,ZodURL:()=>Tn,ZodUUID:()=>$e,ZodUndefined:()=>Zs,ZodUnion:()=>Cn,ZodUnknown:()=>Ms,ZodVoid:()=>Js,ZodXID:()=>Ci,ZodXor:()=>Ws,_ZodString:()=>ji,_default:()=>ul,_function:()=>bm,any:()=>qf,array:()=>Un,base64:()=>jf,base64url:()=>Nf,bigint:()=>Jf,boolean:()=>Ls,catch:()=>ml,check:()=>$m,cidrv4:()=>Pf,cidrv6:()=>Of,clone:()=>U,codec:()=>gm,coerce:()=>Ol,compile:()=>Gc,config:()=>M,core:()=>Se,creditCard:()=>Df,cuid:()=>$f,cuid2:()=>_f,currencyCode:()=>Zf,custom:()=>_m,date:()=>Yf,decode:()=>Ss,decodeAsync:()=>Ps,deepPartial:()=>Tm,describe:()=>km,discriminatedUnion:()=>im,e164:()=>Ef,email:()=>lf,emoji:()=>yf,encode:()=>Is,encodeAsync:()=>zs,endsWith:()=>zt,enum:()=>qi,exactOptional:()=>ol,file:()=>dm,flattenError:()=>nn,float32:()=>Vf,float64:()=>Bf,formatError:()=>rn,fromJSONSchema:()=>Em,function:()=>bm,getDiscriminatedOption:()=>hc,getErrorMap:()=>Sb,globalRegistry:()=>X,gt:()=>ye,gte:()=>se,guid:()=>df,hash:()=>Rf,hex:()=>Cf,hostname:()=>Lf,httpUrl:()=>hf,iban:()=>Tf,includes:()=>It,input:()=>Um,instanceof:()=>wm,int:()=>Pi,int32:()=>Mf,int64:()=>Kf,intersection:()=>qs,invertCodec:()=>vm,ipv4:()=>If,ipv6:()=>zf,iso:()=>Mn,json:()=>Sm,jwt:()=>Af,keyof:()=>Qf,ksuid:()=>wf,lazy:()=>_l,length:()=>Qe,literal:()=>lm,locales:()=>wn,looseObject:()=>nm,looseRecord:()=>am,lowercase:()=>xt,lt:()=>he,lte:()=>ue,mac:()=>Sf,map:()=>cm,maxLength:()=>Ye,maxSize:()=>Ee,memoizer:()=>kn,meta:()=>xm,mime:()=>Ot,minLength:()=>Ie,minSize:()=>be,multipleOf:()=>Ne,nan:()=>mm,nanoid:()=>bf,nativeEnum:()=>sm,negative:()=>hi,never:()=>Xi,nonnegative:()=>bi,nonoptional:()=>dl,nonpositive:()=>yi,normalize:()=>jt,null:()=>Vs,nullable:()=>Dn,nullish:()=>pm,number:()=>Us,object:()=>em,optional:()=>nt,output:()=>Lm,overwrite:()=>ge,parse:()=>_s,parseAsync:()=>ks,partialRecord:()=>om,pipe:()=>Oi,positive:()=>vi,prefault:()=>ll,preprocess:()=>zm,prettifyError:()=>wo,promise:()=>ym,properties:()=>Pt,property:()=>$i,readonly:()=>yl,record:()=>Qs,refine:()=>wl,regex:()=>kt,regexes:()=>pe,registry:()=>Jr,safeDecode:()=>js,safeDecodeAsync:()=>Es,safeEncode:()=>Os,safeEncodeAsync:()=>Ns,safeParse:()=>xs,safeParseAsync:()=>ws,set:()=>um,setErrorMap:()=>Ib,size:()=>He,slugify:()=>Tt,startsWith:()=>St,strictObject:()=>tm,string:()=>En,stringFormat:()=>Uf,stringbool:()=>Im,success:()=>fm,superRefine:()=>Il,symbol:()=>Gf,templateLiteral:()=>hm,toJSONSchema:()=>wi,toLowerCase:()=>Et,toUpperCase:()=>Dt,toZod:()=>Wt,transform:()=>Hi,treeifyError:()=>xo,trim:()=>Nt,tuple:()=>Ys,uint32:()=>Ff,uint64:()=>Wf,ulid:()=>kf,undefined:()=>Xf,union:()=>Ft,unknown:()=>tt,uppercase:()=>wt,url:()=>vf,util:()=>y,uuid:()=>pf,uuidv4:()=>ff,uuidv6:()=>mf,uuidv7:()=>gf,validate:()=>on,validateAsync:()=>an,void:()=>Hf,withParser:()=>Kr,xid:()=>xf,xor:()=>rm});var Se={};_e(Se,{$ZodAny:()=>sc,$ZodArray:()=>mc,$ZodAsyncError:()=>oe,$ZodBase64:()=>Ha,$ZodBase64URL:()=>Ya,$ZodBigInt:()=>Nr,$ZodBigIntFormat:()=>oc,$ZodBoolean:()=>vn,$ZodCIDRv4:()=>Xa,$ZodCIDRv6:()=>qa,$ZodCUID:()=>La,$ZodCUID2:()=>Ca,$ZodCatch:()=>Dc,$ZodCheck:()=>R,$ZodCheckBigIntFormat:()=>la,$ZodCheckEndsWith:()=>ka,$ZodCheckGreaterThan:()=>gr,$ZodCheckIncludes:()=>$a,$ZodCheckLengthEquals:()=>va,$ZodCheckLessThan:()=>mr,$ZodCheckLowerCase:()=>ya,$ZodCheckMaxLength:()=>ma,$ZodCheckMaxSize:()=>da,$ZodCheckMimeType:()=>Ia,$ZodCheckMinLength:()=>ga,$ZodCheckMinSize:()=>pa,$ZodCheckMultipleOf:()=>ua,$ZodCheckNumberFormat:()=>sa,$ZodCheckOverwrite:()=>Sa,$ZodCheckProperties:()=>wa,$ZodCheckProperty:()=>xa,$ZodCheckRegex:()=>ha,$ZodCheckSizeEquals:()=>fa,$ZodCheckStartsWith:()=>_a,$ZodCheckStringFormat:()=>ht,$ZodCheckUpperCase:()=>ba,$ZodCodec:()=>yn,$ZodCreditCard:()=>ec,$ZodCustom:()=>Rc,$ZodCustomStringFormat:()=>rc,$ZodCyclicError:()=>Cr,$ZodDate:()=>fc,$ZodDefault:()=>Oc,$ZodDiscriminatedUnion:()=>yc,$ZodE164:()=>Qa,$ZodEmail:()=>Na,$ZodEmoji:()=>Aa,$ZodEncodeError:()=>je,$ZodEnum:()=>xc,$ZodError:()=>ko,$ZodExactOptional:()=>zc,$ZodFile:()=>Ic,$ZodFunction:()=>Cc,$ZodGUID:()=>Oa,$ZodIBAN:()=>tc,$ZodIPv4:()=>Ka,$ZodIPv6:()=>Wa,$ZodISODate:()=>Ma,$ZodISODateTime:()=>Ba,$ZodISODuration:()=>Ja,$ZodISOTime:()=>Fa,$ZodIntersection:()=>bc,$ZodJWT:()=>nc,$ZodKSUID:()=>Va,$ZodLazy:()=>bn,$ZodLiteral:()=>wc,$ZodMAC:()=>Ga,$ZodMap:()=>_c,$ZodNaN:()=>Tc,$ZodNanoID:()=>Ua,$ZodNever:()=>dc,$ZodNonOptional:()=>Nc,$ZodNull:()=>uc,$ZodNullable:()=>Pc,$ZodNumber:()=>jr,$ZodNumberFormat:()=>ic,$ZodObject:()=>bd,$ZodObjectJIT:()=>gc,$ZodOptional:()=>Dr,$ZodPipe:()=>Tr,$ZodPrefault:()=>jc,$ZodPreprocess:()=>Ac,$ZodPromise:()=>Zc,$ZodReadonly:()=>Uc,$ZodRealError:()=>ae,$ZodRecord:()=>$c,$ZodRegistry:()=>Fr,$ZodSet:()=>kc,$ZodString:()=>Ke,$ZodStringFormat:()=>L,$ZodSuccess:()=>Ec,$ZodSymbol:()=>ac,$ZodTemplateLiteral:()=>Lc,$ZodTransform:()=>Sc,$ZodTuple:()=>Er,$ZodType:()=>O,$ZodULID:()=>Za,$ZodURL:()=>Ta,$ZodUUID:()=>ja,$ZodUndefined:()=>cc,$ZodUnion:()=>hn,$ZodUnknown:()=>lc,$ZodVoid:()=>pc,$ZodXID:()=>Ra,$ZodXor:()=>vc,$brand:()=>bo,$constructor:()=>g,$input:()=>Fc,$output:()=>Mc,Doc:()=>Je,INVALID:()=>ee,JSONSchema:()=>cf,JSONSchemaGenerator:()=>Ii,NEVER:()=>yo,TimePrecision:()=>tu,URL_BAD_FORMAT:()=>Ea,URL_UNPARSEABLE:()=>dn,ZodCompileAsyncError:()=>me,ZodCompileUnsupportedError:()=>D,_any:()=>yu,_array:()=>Iu,_base64:()=>pi,_base64url:()=>fi,_bigint:()=>du,_boolean:()=>su,_catch:()=>sb,_check:()=>Fp,_cidrv4:()=>li,_cidrv6:()=>di,_coercedBigint:()=>pu,_coercedBoolean:()=>lu,_coercedDate:()=>xu,_coercedNumber:()=>ru,_coercedString:()=>Hc,_creditCard:()=>Qc,_cuid:()=>ri,_cuid2:()=>ii,_custom:()=>zu,_date:()=>ku,_decode:()=>rr,_decodeAsync:()=>or,_default:()=>ab,_discriminatedUnion:()=>Gy,_e164:()=>mi,_email:()=>Xr,_emoji:()=>ti,_encode:()=>nr,_encodeAsync:()=>ir,_endsWith:()=>zt,_enum:()=>eb,_file:()=>Su,_float32:()=>ou,_float64:()=>au,_gt:()=>ye,_gte:()=>se,_guid:()=>qr,_iban:()=>eu,_includes:()=>It,_int:()=>iu,_int32:()=>cu,_int64:()=>fu,_intersection:()=>Xy,_ipv4:()=>ui,_ipv6:()=>si,_isoDate:()=>zn,_isoDateTime:()=>Sn,_isoDuration:()=>On,_isoTime:()=>Pn,_jwt:()=>gi,_ksuid:()=>ci,_lazy:()=>fb,_length:()=>Qe,_literal:()=>nb,_lowercase:()=>xt,_lt:()=>he,_lte:()=>ue,_mac:()=>Yc,_map:()=>Yy,_max:()=>ue,_maxLength:()=>Ye,_maxSize:()=>Ee,_mime:()=>Ot,_min:()=>se,_minLength:()=>Ie,_minSize:()=>be,_multipleOf:()=>Ne,_nan:()=>wu,_nanoid:()=>ni,_nativeEnum:()=>tb,_negative:()=>hi,_never:()=>$u,_nonnegative:()=>bi,_nonoptional:()=>cb,_nonpositive:()=>yi,_normalize:()=>jt,_null:()=>hu,_nullable:()=>ob,_number:()=>nu,_optional:()=>ib,_overwrite:()=>ge,_parse:()=>ft,_parseAsync:()=>mt,_pipe:()=>lb,_positive:()=>vi,_promise:()=>mb,_properties:()=>Pt,_property:()=>$i,_readonly:()=>db,_record:()=>Hy,_refine:()=>Pu,_regex:()=>kt,_safeDecode:()=>cr,_safeDecodeAsync:()=>sr,_safeEncode:()=>ar,_safeEncodeAsync:()=>ur,_safeParse:()=>gt,_safeParseAsync:()=>vt,_set:()=>Qy,_size:()=>He,_slugify:()=>Tt,_startsWith:()=>St,_string:()=>qc,_stringFormat:()=>et,_stringbool:()=>Eu,_success:()=>ub,_superRefine:()=>Ou,_symbol:()=>gu,_templateLiteral:()=>pb,_toLowerCase:()=>Et,_toUpperCase:()=>Dt,_transform:()=>rb,_trim:()=>Nt,_tuple:()=>qy,_uint32:()=>uu,_uint64:()=>mu,_ulid:()=>oi,_undefined:()=>vu,_union:()=>Ky,_unknown:()=>bu,_uppercase:()=>wt,_url:()=>In,_uuid:()=>Hr,_uuidv4:()=>Yr,_uuidv6:()=>Qr,_uuidv7:()=>ei,_void:()=>_u,_xid:()=>ai,_xor:()=>Wy,base64Charset:()=>Ir,base64urlCharset:()=>gn,canParseURL:()=>Da,clone:()=>U,compile:()=>Gc,compileFn:()=>Wr,config:()=>M,createStandardJSONSchemaMethod:()=>At,createToJSONSchemaMethod:()=>Tu,decode:()=>qg,decodeAsync:()=>Yg,describe:()=>ju,encode:()=>Xg,encodeAsync:()=>Hg,extractDefs:()=>Te,finalize:()=>Ae,flattenError:()=>nn,formatError:()=>rn,getDiscriminatedOption:()=>hc,globalConfig:()=>W,globalRegistry:()=>X,handleUnrepresentable:()=>J,initializeContext:()=>De,isBackEdge:()=>Rr,isRecursiveSchema:()=>Zr,isValidBase64:()=>mn,isValidBase64URL:()=>Sr,isValidCIDRv6:()=>wr,isValidCreditCard:()=>zr,isValidIBAN:()=>Pr,isValidIPv6:()=>fn,isValidJWT:()=>Or,locales:()=>wn,memoizer:()=>kn,mergeValues:()=>yt,meta:()=>Nu,parse:()=>er,parseAsync:()=>tr,parseURLObject:()=>vd,prettifyError:()=>wo,process:()=>C,processSchema:()=>C,regexes:()=>pe,registry:()=>Jr,safeDecode:()=>ev,safeDecodeAsync:()=>nv,safeEncode:()=>Qg,safeEncodeAsync:()=>tv,safeParse:()=>Fg,safeParseAsync:()=>Jg,standardProps:()=>$r,stripTabAndNewline:()=>pn,toDotPath:()=>Xl,toJSONSchema:()=>wi,toZod:()=>Wt,treeifyError:()=>xo,urlHostnameOk:()=>kr,urlProtocolOk:()=>xr,util:()=>y,validate:()=>on,validateAsync:()=>an,validateURL:()=>_r,version:()=>za,withParser:()=>Kr});var y={};_e(y,{BIGINT_FORMAT_RANGES:()=>Yt,CONSTANT_CATCH:()=>Yn,Class:()=>co,NUMBER_FORMAT_RANGES:()=>Ht,aborted:()=>Q,allowsEval:()=>lo,assert:()=>lg,assertEqual:()=>ag,assertIs:()=>ug,assertNever:()=>sg,assertNotEqual:()=>cg,assignProp:()=>G,attachSchema:()=>Hn,base64ToUint8Array:()=>Ml,base64urlToUint8Array:()=>Og,cached:()=>lt,captureStackTrace:()=>Xn,cleanEnum:()=>Pg,cleanRegex:()=>xe,clone:()=>U,cloneDef:()=>fg,codePointLength:()=>Me,constantCatch:()=>vo,createTransparentProxy:()=>bg,defineLazy:()=>uo,defineLazyInternal:()=>E,derived:()=>Dg,esc:()=>Y,escapeRegex:()=>de,explicitlyAborted:()=>mo,extend:()=>kg,finalizeIssue:()=>ie,floatSafeRemainder:()=>Gt,getElementAtPath:()=>mg,getEnumValues:()=>ut,getLengthableOrigin:()=>en,getParsedType:()=>yg,getSizableOrigin:()=>Qt,hexToUint8Array:()=>Ng,hide:()=>tn,installLazyProp:()=>Lg,isObject:()=>Be,isPlainObject:()=>le,issue:()=>pt,joinValues:()=>v,jsonStringifyReplacer:()=>st,members:()=>go,merge:()=>wg,mergeDefs:()=>fe,normalizeParams:()=>k,nullish:()=>Gn,numKeys:()=>hg,objectClone:()=>dg,omit:()=>_g,optionalKeys:()=>fo,own:()=>Oe,parsedType:()=>$,partial:()=>Ig,pick:()=>$g,prefixIssues:()=>re,primitiveTypes:()=>po,promiseAllObject:()=>gg,propertyKeyTypes:()=>qt,randomString:()=>vg,rawShape:()=>dt,required:()=>Sg,safeExtend:()=>xg,shallowClone:()=>Xt,slugify:()=>so,stringifyPrimitive:()=>b,toZod:()=>Wt,uint8ArrayToBase64:()=>Fl,uint8ArrayToBase64url:()=>jg,uint8ArrayToHex:()=>Eg,unwrapMessage:()=>ct});function ag(e){return e}function cg(e){return e}function Wt(){return e=>e}function ug(e){}function sg(e){throw new Error("Unexpected value in exhaustive check")}function lg(e){}function ut(e){let n=Object.values(e).filter(o=>typeof o=="number");return Object.entries(e).filter(([o,t])=>n.indexOf(+o)===-1).map(([o,t])=>t)}function v(e,n="|"){return e.map(i=>b(i)).join(n)}function st(e,n){return typeof n=="bigint"?n.toString():n}var ao=class{constructor(n){this._getter=n,this._value=void 0}get value(){let n=this._getter;return n!==void 0&&(this._value=n(),this._getter=void 0),this._value}};function lt(e){return new ao(e)}function Gn(e){return e==null}function xe(e){let n=e.startsWith("^")?1:0,i=e.endsWith("$")?e.length-1:e.length;return e.slice(n,i)}function Gt(e,n){let i=e/n,o=Math.round(i),t=4*Number.EPSILON*Math.max(Math.abs(i),1);return Math.abs(i-o)<t?0:i-o}var Zl=Symbol("evaluating");function uo(e,n,i){let o;Object.defineProperty(e,n,{get(){if(o!==Zl)return o===void 0&&(o=Zl,o=i()),o},set(t){Object.defineProperty(e,n,{value:t})},configurable:!0})}function dg(e){return Object.create(Object.getPrototypeOf(e),Object.getOwnPropertyDescriptors(e))}function G(e,n,i){Object.defineProperty(e,n,{value:i,writable:!0,enumerable:!0,configurable:!0})}function dt(e){let n=Object.getOwnPropertyDescriptor(e,"shape");return n?.get?n.get.raw:n?.value}function ke(e){return dt(e._zod.def)??e._zod.def.shape}function Rl(e,n,i){Object.defineProperty(e,n,{get(){let o=i();return G(this,n,o),o},enumerable:!0,configurable:!0})}function Vl(e,n,i){n in e?G(e,n,i):e[n]=i}function Ve(e,n,i,o){let t=ke(n);for(let r of i){let a=Object.getOwnPropertyDescriptor(t,r);a.enumerable&&(a.get?Rl(e,r,()=>{let c=n._zod.def.shape[r];return o?o(c,r):c}):Vl(e,r,o?o(a.value,r):a.value))}}function pg(e,n){for(let i of Reflect.ownKeys(n)){let o=Object.getOwnPropertyDescriptor(n,i);o.enumerable&&(o.get?Rl(e,i,()=>n[i]):Vl(e,i,o.value))}}function fe(...e){let n={};for(let i of e){let o=Object.getOwnPropertyDescriptors(i);Object.assign(n,o)}return Object.defineProperties({},n)}function fg(e){return fe(e._zod.def)}function mg(e,n){return n?n.reduce((i,o)=>i?.[o],e):e}function gg(e){let n=Object.keys(e),i=n.map(o=>e[o]);return Promise.all(i).then(o=>{let t={};for(let r=0;r<n.length;r++)t[n[r]]=o[r];return t})}function vg(e=10){let n="abcdefghijklmnopqrstuvwxyz",i="";for(let o=0;o<e;o++)i+=n[Math.floor(Math.random()*n.length)];return i}function Y(e){return JSON.stringify(e)}function so(e){return e.toLowerCase().trim().replace(/[^\w\s-]/g,"").replace(/[\s_-]+/g,"-").replace(/^-+|-+$/g,"")}var Xn="captureStackTrace"in Error?Error.captureStackTrace:(...e)=>{};function Be(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}var lo=lt(()=>{if(W.jitless||typeof navigator<"u"&&navigator?.userAgent?.includes("Cloudflare"))return!1;try{let e=Function;return new e(""),!0}catch{return!1}});function le(e){if(Be(e)===!1)return!1;let n=e.constructor;if(n===void 0||typeof n!="function")return!0;let i=n.prototype;return!(Be(i)===!1||Object.prototype.hasOwnProperty.call(i,"isPrototypeOf")===!1)}function Xt(e){return le(e)?{...e}:Array.isArray(e)?[...e]:e instanceof Map?new Map(e):e instanceof Set?new Set(e):e}function hg(e){let n=0;for(let i in e)Object.prototype.hasOwnProperty.call(e,i)&&n++;return n}var yg=e=>{let n=typeof e;switch(n){case"undefined":return"undefined";case"string":return"string";case"number":return Number.isNaN(e)?"nan":"number";case"boolean":return"boolean";case"function":return"function";case"bigint":return"bigint";case"symbol":return"symbol";case"object":return Array.isArray(e)?"array":e===null?"null":e.then&&typeof e.then=="function"&&e.catch&&typeof e.catch=="function"?"promise":typeof Map<"u"&&e instanceof Map?"map":typeof Set<"u"&&e instanceof Set?"set":typeof Date<"u"&&e instanceof Date?"date":typeof File<"u"&&e instanceof File?"file":"object";default:throw new Error(`Unknown data type: ${n}`)}},qt=new Set(["string","number","symbol"]),po=new Set(["string","number","bigint","boolean","symbol","undefined"]);function de(e){return e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function U(e,n,i){let o=new e._zod.constr(n??e._zod.def);return(!n||i?.parent)&&(o._zod.parent=e),o}function k(e){let n=e;if(!n)return{};if(typeof n=="string")return{error:()=>n};if(n?.message!==void 0){if(n?.error!==void 0)throw new Error("Cannot specify both `message` and `error` params");n.error=n.message}return delete n.message,typeof n.error=="string"?{...n,error:()=>n.error}:n}function bg(e){let n;return new Proxy({},{get(i,o,t){return n??(n=e()),Reflect.get(n,o,t)},set(i,o,t,r){return n??(n=e()),Reflect.set(n,o,t,r)},has(i,o){return n??(n=e()),Reflect.has(n,o)},deleteProperty(i,o){return n??(n=e()),Reflect.deleteProperty(n,o)},ownKeys(i){return n??(n=e()),Reflect.ownKeys(n)},getOwnPropertyDescriptor(i,o){return n??(n=e()),Reflect.getOwnPropertyDescriptor(n,o)},defineProperty(i,o,t){return n??(n=e()),Reflect.defineProperty(n,o,t)}})}function b(e){return typeof e=="bigint"?e.toString()+"n":typeof e=="string"?`"${e}"`:`${e}`}function fo(e){return Object.keys(e).filter(n=>e[n]._zod.optin!==void 0&&e[n]._zod.optout==="optional")}var Ht={safeint:[Number.MIN_SAFE_INTEGER,Number.MAX_SAFE_INTEGER],int32:[-2147483648,2147483647],uint32:[0,4294967295],float32:[-34028234663852886e22,34028234663852886e22],float64:[-Number.MAX_VALUE,Number.MAX_VALUE]},Yt={int64:[BigInt("-9223372036854775808"),BigInt("9223372036854775807")],uint64:[BigInt(0),BigInt("18446744073709551615")]};function $g(e,n){let i=e._zod.def,o=i.checks;if(o&&o.length>0)throw new Error(".pick() cannot be used on object schemas containing refinements");let r={};return Ve(r,e,qn(e,n)),U(e,fe(i,{shape:r,checks:[]}))}function qn(e,n){let i=ke(e),o=[];for(let t of Reflect.ownKeys(n)){if(!Object.getOwnPropertyDescriptor(i,t)?.enumerable)throw new Error(`Unrecognized key: "${String(t)}"`);n[t]&&o.push(t)}return o}function _g(e,n){let i=e._zod.def,o=i.checks;if(o&&o.length>0)throw new Error(".omit() cannot be used on object schemas containing refinements");let r=new Set(qn(e,n)),a={};return Ve(a,e,Reflect.ownKeys(ke(e)).filter(c=>!r.has(c))),U(e,fe(i,{shape:a,checks:[]}))}function kg(e,n){if(!le(n))throw new Error("Invalid input to extend: expected a plain object");let i=e._zod.def.checks;if(i&&i.length>0){let t=ke(e);for(let r of Reflect.ownKeys(n))if(Object.getOwnPropertyDescriptor(t,r)!==void 0)throw new Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.")}return U(e,fe(e._zod.def,{shape:Bl(e,n)}))}function Bl(e,n){let i={};return Ve(i,e,Reflect.ownKeys(ke(e))),pg(i,n),i}function xg(e,n){if(!le(n))throw new Error("Invalid input to safeExtend: expected a plain object");return U(e,fe(e._zod.def,{shape:Bl(e,n)}))}function wg(e,n){if(!n?._zod?.def)throw new Error("Invalid input to merge: expected an object schema. To merge a plain shape, use `.extend()`.");if(e._zod.def.checks?.length)throw new Error(".merge() cannot be used on object schemas containing refinements. Use .safeExtend() instead.");let i={};Ve(i,e,Reflect.ownKeys(ke(e))),Ve(i,n,Reflect.ownKeys(ke(n)));let o=fe(e._zod.def,{shape:i,get catchall(){return n._zod.def.catchall},checks:n._zod.def.checks??[]});return U(e,o)}function Ig(e,n,i,o="partial"){let r=n._zod.def.checks;if(r&&r.length>0)throw new Error(`.${o}() cannot be used on object schemas containing refinements`);let c=i?new Set(qn(n,i)):void 0,u={};return Ve(u,n,Reflect.ownKeys(ke(n)),e&&((s,l)=>c&&!c.has(l)?s:new e({type:"optional",innerType:s}))),U(n,fe(n._zod.def,{shape:u,checks:[]}))}function Sg(e,n,i){let o=i?new Set(qn(n,i)):void 0,t={};return Ve(t,n,Reflect.ownKeys(ke(n)),(r,a)=>o&&!o.has(a)?r:new e({type:"nonoptional",innerType:r})),U(n,fe(n._zod.def,{shape:t}))}function Q(e,n=0){if(e.aborted===!0)return!0;for(let i=n;i<e.issues.length;i++)if(e.issues[i]?.continue!==!0)return!0;return!1}function mo(e,n=0){if(e.aborted===!0)return!0;for(let i=n;i<e.issues.length;i++)if(e.issues[i]?.continue===!1)return!0;return!1}function re(e,n){return n.map(i=>{var o;return(o=i).path??(o.path=[]),i.path.unshift(e),i})}function ct(e){return typeof e=="string"?e:e?.message}function Hn(e,n,i){var o;for(let t=n;t<e.length;t++)(o=e[t]).schema??(o.schema=i)}function ie(e,n,i){var o;let t=e.inst?._zod?.traits;t?.has("$ZodType")&&(t.has("$ZodCheck")?(o=e).schema??(o.schema=e.inst):e.schema=e.inst);let r=e.schema!==e.inst?e.schema?._zod.def?.error:void 0,a=e.message?e.message:ct(e.inst?._zod.def?.error?.(e))??ct(r?.(e))??ct(n?.error?.(e))??ct(i.customError?.(e))??ct(i.localeError?.(e))??"Invalid input",c={};for(let u of Object.keys(e))u==="inst"||u==="schema"||u==="continue"||u==="input"||u==="__proto__"||(c[u]=e[u]);return c.path??(c.path=[]),c.message=a,n?.reportInput&&(c.input=e.input),c}function Qt(e){return e instanceof Set?"set":e instanceof Map?"map":e instanceof File?"file":"unknown"}var zg=/[\uD800-\uDBFF]/;function Me(e){let n=e.length;if(!zg.test(e))return n;let i=n;for(let o=0;o<n-1;o++)(e.charCodeAt(o)&64512)===55296&&(e.charCodeAt(o+1)&64512)===56320&&(i--,o++);return i}function en(e){return Array.isArray(e)?"array":typeof e=="string"?"string":"unknown"}function $(e){let n=typeof e;switch(n){case"number":return Number.isNaN(e)?"nan":"number";case"object":{if(e===null)return"null";if(Array.isArray(e))return"array";let i=e;if(i&&Object.getPrototypeOf(i)!==Object.prototype&&"constructor"in i&&i.constructor)return i.constructor.name}}return n}function pt(...e){let[n,i,o]=e;return typeof n=="string"?{message:n,code:"custom",input:i,inst:o}:{...n}}function Pg(e){return Object.entries(e).filter(([n,i])=>Number.isNaN(Number.parseInt(n,10))).map(n=>n[1])}function Ml(e){let n=atob(e),i=new Uint8Array(n.length);for(let o=0;o<n.length;o++)i[o]=n.charCodeAt(o);return i}function Fl(e){let n="";for(let i=0;i<e.length;i++)n+=String.fromCharCode(e[i]);return btoa(n)}function Og(e){let n=e.replace(/-/g,"+").replace(/_/g,"/"),i="=".repeat((4-n.length%4)%4);return Ml(n+i)}function jg(e){return Fl(e).replace(/\+/g,"-").replace(/\//g,"_").replace(/=/g,"")}function Ng(e){let n=e.replace(/^0x/,"");if(n.length%2!==0)throw new Error("Invalid hex string length");let i=new Uint8Array(n.length/2);for(let o=0;o<n.length;o+=2)i[o/2]=Number.parseInt(n.slice(o,o+2),16);return i}function Eg(e){return Array.from(e).map(n=>n.toString(16).padStart(2,"0")).join("")}var co=class{constructor(...n){}};function go(e,n){for(let i in n){let o=Object.getOwnPropertyDescriptor(n,i);o.get?Object.defineProperty(e,i,{...o,enumerable:!1}):Tg(e,i,o.value)}}function Oe(e,n,i,o=!0){return Object.defineProperty(e,n,{configurable:!0,writable:!0,enumerable:o,value:i}),i}function tn(e,n,i){return Oe(e,n,i,!1)}function Dg(e,n){for(let i in e){let o=e[i];Object.defineProperty(n,i,{configurable:!0,enumerable:!0,get(){return Oe(this,i,o(this))},set(t){Oe(this,i,t)}})}return n}function Tg(e,n,i){Object.defineProperty(e,n,{configurable:!0,get(){return this==null?i:Oe(this,n,i.bind(this))},set(o){Oe(this,n,o)}})}function Ag(e,n){let i=Object.getPrototypeOf(e);return n in i?void 0:i}var oo,Pe=!1,Ug={configurable:!0,get(){Pe=!0}};function E(e,n,i){let o=Object.getPrototypeOf(e._zod);if(n in o&&oo!==e._zod){oo=void 0;return}oo=e._zod,Object.defineProperty(o,n,{configurable:!0,get(){Object.defineProperty(this,n,Ug);let t=Pe;Pe=!1;try{let r=i(this);return Pe?delete this[n]:Object.defineProperty(this,n,{configurable:!0,writable:!0,value:r}),Pe=Pe||t,r}catch(r){throw delete this[n],Pe=Pe||t,r}},set(t){Object.defineProperty(this,n,{configurable:!0,writable:!0,value:t})}})}function Lg(e,n,i,o){let t=Ag(e,n);t&&Object.defineProperty(t,n,{configurable:!0,get(){let r={configurable:!0,writable:!0,enumerable:o,value:void 0};return Object.defineProperty(this,n,r),r.value=i(this),Object.defineProperty(this,n,r),r.value},set(r){Object.defineProperty(this,n,{configurable:!0,writable:!0,enumerable:o,value:r})}})}var Yn="~constantCatch";function vo(e){let n=()=>e;return n[Yn]=!0,n}var Jl,yo=Object.freeze({status:"aborted"}),ho={value:void 0,enumerable:!1},Kl="captureStackTrace"in Error?Error:null;function Cg(e){let n=Kl;if(n){let i=n.stackTraceLimit;if(typeof i=="number"){try{n.stackTraceLimit=0}catch{return Kl=null,new e}try{return new e}finally{n.stackTraceLimit=i}}}return new e}function g(e,n,i,o){let t={};function r(f){this.def=f,this.constr=p,this.traits=new Set}r.prototype=t;let a=i,c=a&&new WeakSet;function u(f,m){if(f._zod){if(f._zod.traits.has(e))return}else{ho.value=new r(m);try{Object.defineProperty(f,"_zod",ho)}finally{ho.value=void 0}}if(f._zod.traits.add(e),n(f,m),c){let _=Object.getPrototypeOf(f),x=f._zod.constr.prototype,z=_;for(;z&&z!==x;)z=Object.getPrototypeOf(z);let I=z??_;c.has(I)||(c.add(I),go(I,a))}let h=p.prototype;for(let _ in h)Object.prototype.hasOwnProperty.call(h,_)&&(_ in f||(f[_]=h[_].bind(f)))}let s=o?.Parent??Object;class l extends s{}Object.defineProperty(l,"name",{value:e});function p(f){let m=o?.Parent?Cg(l):this;u(m,f);let h=m._zod.deferred;if(h){for(let x of h)x();m._zod.deferred=void 0}let _=globalThis.__zod_globalConfig?.postProcessor;return _&&_(m),m}return Object.defineProperty(p,"init",{value:u}),Object.defineProperty(p,Symbol.hasInstance,{value:f=>o?.Parent&&f instanceof o.Parent?!0:f?._zod?.traits?.has(e)}),Object.defineProperty(p,"name",{value:e}),p}var bo=Symbol("zod_brand"),oe=class extends Error{constructor(){super("Encountered Promise during synchronous parse. Use .parseAsync() instead.")}},je=class extends Error{constructor(n){super(`Encountered unidirectional transform during encode: ${n}`),this.name="ZodEncodeError"}};(Jl=globalThis).__zod_globalConfig??(Jl.__zod_globalConfig={});var W=globalThis.__zod_globalConfig;function M(e){return e&&Object.assign(W,e),W}function Zg(){let e=this._zod;return e.message??(e.message=JSON.stringify(e.def,st,2)),e.message}function Rg(e){this._zod.message=e}var Vg={get:Zg,set:Rg,enumerable:!0,configurable:!0},_o={value:void 0,enumerable:!1},Wl=new WeakSet([Object.prototype,Error.prototype]),Gl=(e,n)=>{e.name="$ZodError",_o.value=n,Object.defineProperty(e,"issues",_o),_o.value=void 0,Object.defineProperty(e,"message",Vg);let i=Object.getPrototypeOf(e);Wl.has(i)||(Wl.add(i),Object.defineProperty(i,"toString",{configurable:!0,enumerable:!1,get(){let o=()=>this.message;return Object.defineProperty(this,"toString",{value:o,configurable:!0,writable:!0}),o},set(o){Object.defineProperty(this,"toString",{value:o,configurable:!0,writable:!0})}}))},ko=g("$ZodError",Gl),ae=g("$ZodError",Gl,void 0,{Parent:Error});function Bg(e,n,i){return Object.prototype.hasOwnProperty.call(e,n)||(n==="__proto__"?Object.defineProperty(e,n,{value:i(),writable:!0,enumerable:!0,configurable:!0}):e[n]=i()),e[n]}function nn(e,n=i=>i.message){let i={},o=[];for(let t of e.issues)t.path.length>0?Bg(i,t.path[0],()=>[]).push(n(t)):o.push(n(t));return{formErrors:o,fieldErrors:i}}function rn(e,n=i=>i.message){let i={_errors:[]},o=(t,r=[])=>{for(let a of t.issues)if(a.code==="invalid_union"&&a.errors.length)a.errors.map(c=>o({issues:c},[...r,...a.path]));else if(a.code==="invalid_key")o({issues:a.issues},[...r,...a.path]);else if(a.code==="invalid_element")o({issues:a.issues},[...r,...a.path]);else{let c=[...r,...a.path];if(c.length===0)i._errors.push(n(a));else{let u=i,s=0;for(;s<c.length;){let l=c[s],p=s===c.length-1;if(l==="_errors"){p&&u._errors.push(n(a)),s++;continue}Object.prototype.hasOwnProperty.call(u,l)||Object.defineProperty(u,l,{value:{_errors:[]},enumerable:!0,writable:!0,configurable:!0});let f=u[l];p&&f._errors.push(n(a)),u=f,s++}}}};return o(e),i}function xo(e,n=i=>i.message){let i={errors:[]},o=(t,r=[])=>{var a;for(let c of t.issues)if(c.code==="invalid_union"&&c.errors.length)c.errors.map(u=>o({issues:u},[...r,...c.path]));else if(c.code==="invalid_key")o({issues:c.issues},[...r,...c.path]);else if(c.code==="invalid_element")o({issues:c.issues},[...r,...c.path]);else{let u=[...r,...c.path];if(u.length===0){i.errors.push(n(c));continue}let s=i,l=0;for(;l<u.length;){let p=u[l],f=l===u.length-1;typeof p=="string"?(s.properties??(s.properties={}),Object.prototype.hasOwnProperty.call(s.properties,p)||Object.defineProperty(s.properties,p,{value:{errors:[]},enumerable:!0,writable:!0,configurable:!0}),s=s.properties[p]):(s.items??(s.items=[]),(a=s.items)[p]??(a[p]={errors:[]}),s=s.items[p]),f&&s.errors.push(n(c)),l++}}};return o(e),i}function Xl(e){let n=[],i=e.map(o=>typeof o=="object"?o.key:o);for(let o of i)typeof o=="number"?n.push(`[${o}]`):typeof o=="symbol"?n.push(`[${JSON.stringify(String(o))}]`):/[^\w$]/.test(o)?n.push(`[${JSON.stringify(o)}]`):(n.length&&n.push("."),n.push(o));return n.join("")}function wo(e){let n=[],i=[...e.issues].sort((o,t)=>(o.path??[]).length-(t.path??[]).length);for(let o of i)n.push(`✖ ${o.message}`),o.path?.length&&n.push(`  → at ${Xl(o.path)}`);return n.join(`
`)}function Qn(e,n){return{callee:n?.callee??e,Err:n?.Err}}var ft=e=>{let n=(i,o,t,r)=>{let a=t?{...t,async:!1}:{async:!1},c=i._zod.run({value:o,issues:[]},a);if(c instanceof Promise)throw new oe;if(c.issues.length){let u=new(r?.Err??e)(c.issues.map(s=>ie(s,a,M())));throw Xn(u,r?.callee??n),u}return c.value};return n},er=ft(ae),mt=e=>{let n=async(i,o,t,r)=>{let a=t?{...t,async:!0}:{async:!0},c=i._zod.run({value:o,issues:[]},a);if(c instanceof Promise&&(c=await c),c.issues.length){let u=new(r?.Err??e)(c.issues.map(s=>ie(s,a,M())));throw Xn(u,r?.callee??n),u}return c.value};return n},tr=mt(ae),gt=e=>(n,i,o)=>{let t=o?{...o,async:!1}:{async:!1},r=n._zod.run({value:i,issues:[]},t);if(r instanceof Promise)throw new oe;return r.issues.length?ql(e,r.issues,t):{success:!0,data:r.value}},Fg=gt(ae);function ql(e,n,i){let o;return{success:!1,get error(){return o||(o=new e(n.map(t=>ie(t,i,M()))),n=void 0,i=void 0),o},set error(t){o=t,n=void 0,i=void 0}}}var vt=e=>async(n,i,o)=>{let t=o?{...o,async:!0}:{async:!0},r=n._zod.run({value:i,issues:[]},t);return r instanceof Promise&&(r=await r),r.issues.length?ql(e,r.issues,t):{success:!0,data:r.value}},Jg=vt(ae),Kg=Symbol.for("zod.compile.invalid"),Wg=Symbol.for("zod.compile.fallback"),on=(e,n,i)=>{let o=e._zod.bag.validator;if(o!==void 0){if(o(n)!==Kg)return!0;if(o.definite===!0&&i===void 0)return!1}return Gg(e,n,i)};function Gg(e,n,i){let o=i?{...i,async:!1,abortEarly:!0}:{async:!1,abortEarly:!0},t=e._zod.bag.fallbackRun,r;if(t?(o[Wg]=!0,r=t({value:n,issues:[]},o)):r=e._zod.run({value:n,issues:[]},o),r instanceof Promise)throw new oe;return r.issues.length===0}var an=async(e,n,i)=>{let o=i?{...i,async:!0,abortEarly:!0}:{async:!0,abortEarly:!0},t=e._zod.run({value:n,issues:[]},o);return t instanceof Promise&&(t=await t),t.issues.length===0},nr=e=>{let n=ft(e),i=(o,t,r,a)=>{let c=r?{...r,direction:"backward"}:{direction:"backward"};return n(o,t,c,Qn(i,a))};return i},Xg=nr(ae),rr=e=>{let n=ft(e),i=(o,t,r,a)=>n(o,t,r,Qn(i,a));return i},qg=rr(ae),ir=e=>{let n=mt(e),i=async(o,t,r,a)=>{let c=r?{...r,direction:"backward"}:{direction:"backward"};return await n(o,t,c,Qn(i,a))};return i},Hg=ir(ae),or=e=>{let n=mt(e),i=async(o,t,r,a)=>await n(o,t,r,Qn(i,a));return i},Yg=or(ae),ar=e=>(n,i,o)=>{let t=o?{...o,direction:"backward"}:{direction:"backward"};return gt(e)(n,i,t)},Qg=ar(ae),cr=e=>(n,i,o)=>gt(e)(n,i,o),ev=cr(ae),ur=e=>async(n,i,o)=>{let t=o?{...o,direction:"backward"}:{direction:"backward"};return vt(e)(n,i,t)},tv=ur(ae),sr=e=>async(n,i,o)=>vt(e)(n,i,o),nv=sr(ae);var pe={};_e(pe,{anyString:()=>Ho,base64:()=>Bo,base64url:()=>Mo,bigint:()=>Qo,boolean:()=>ea,browserEmail:()=>lv,cidrv4:()=>Ro,cidrv6:()=>Vo,creditCard:()=>lr,cuid:()=>So,cuid2:()=>zo,currencyCode:()=>Wo,date:()=>Go,datetime:()=>qo,domain:()=>Jo,duration:()=>Do,e164:()=>Ko,email:()=>Ao,emoji:()=>Uo,extendedDuration:()=>rv,guid:()=>To,hex:()=>oa,hostname:()=>Fo,html5Email:()=>cv,httpProtocol:()=>cn,iban:()=>dr,idnEmail:()=>sv,integer:()=>un,ipv4:()=>Lo,ipv6:()=>Co,ksuid:()=>jo,lowercase:()=>ra,mac:()=>Zo,md5_base64:()=>mv,md5_base64url:()=>gv,md5_hex:()=>fv,nanoid:()=>No,nanoidOfLength:()=>Eo,null:()=>ta,number:()=>we,rfc5322Email:()=>uv,sha1_base64:()=>hv,sha1_base64url:()=>yv,sha1_hex:()=>vv,sha256_base64:()=>$v,sha256_base64url:()=>_v,sha256_hex:()=>bv,sha384_base64:()=>xv,sha384_base64url:()=>wv,sha384_hex:()=>kv,sha512_base64:()=>Sv,sha512_base64url:()=>zv,sha512_hex:()=>Iv,string:()=>Yo,time:()=>Xo,ulid:()=>Po,undefined:()=>na,unicodeEmail:()=>Hl,uppercase:()=>ia,uuid:()=>Fe,uuid4:()=>iv,uuid6:()=>ov,uuid7:()=>av,xid:()=>Oo});var So=/^[cC][0-9a-z]{6,}$/,zo=/^[0-9a-z]+$/,Po=/^[0-7][0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{25}$/,Oo=/^[0-9a-vA-V]{20}$/,jo=/^[A-Za-z0-9]{27}$/,No=/^[a-zA-Z0-9_-]{21}$/;function Eo(e){return new RegExp(`^[a-zA-Z0-9_-]{${e}}$`)}var Do=/^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/,rv=/^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/,To=/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/,Fe=e=>e?new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${e}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`):/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/,iv=Fe(4),ov=Fe(6),av=Fe(7),Ao=/^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/,cv=/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,uv=/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,Hl=/^[^\s@"]{1,64}@[^\s@]{1,255}$/u,sv=Hl,lv=/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,dv="^(?=[\\s\\S]*[\\p{Extended_Pictographic}\\p{Regional_Indicator}\\u20E3])[\\p{Extended_Pictographic}\\p{Emoji_Component}]+$";function Uo(){return new RegExp(dv,"u")}var Lo=/^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/,Co=/^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/,Zo=e=>{let n=de(e??":");return new RegExp(`^(?:[0-9A-F]{2}${n}){5}[0-9A-F]{2}$|^(?:[0-9a-f]{2}${n}){5}[0-9a-f]{2}$`)},Ro=/^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/,Vo=/^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/,Bo=/^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/,Mo=/^(?:[A-Za-z0-9_-]{4})*(?:[A-Za-z0-9_-]{2,3})?$/,Fo=/^(?=.{1,253}\.?$)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[-0-9a-zA-Z]{0,61}[0-9a-zA-Z])?)*\.?$/,Jo=/^(?=.{1,253}$)([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/,cn=/^https?$/,Ko=/^\+[1-9]\d{6,14}$/,lr=/^\d(?:[ -]?\d){11,18}$/,Wo=/^(?:AED|AFN|ALL|AMD|AOA|ARS|AUD|AWG|AZN|BAM|BBD|BDT|BHD|BIF|BMD|BND|BOB|BOV|BRL|BSD|BTN|BWP|BYN|BZD|CAD|CDF|CHE|CHF|CHW|CLF|CLP|CNY|COP|COU|CRC|CUP|CVE|CZK|DJF|DKK|DOP|DZD|EGP|ERN|ETB|EUR|FJD|FKP|GBP|GEL|GHS|GIP|GMD|GNF|GTQ|GYD|HKD|HNL|HTG|HUF|IDR|ILS|INR|IQD|IRR|ISK|JMD|JOD|JPY|KES|KGS|KHR|KMF|KPW|KRW|KWD|KYD|KZT|LAK|LBP|LKR|LRD|LSL|LYD|MAD|MDL|MGA|MKD|MMK|MNT|MOP|MRU|MUR|MVR|MWK|MXN|MXV|MYR|MZN|NAD|NGN|NIO|NOK|NPR|NZD|OMR|PAB|PEN|PGK|PHP|PKR|PLN|PYG|QAR|RON|RSD|RUB|RWF|SAR|SBD|SCR|SDG|SEK|SGD|SHP|SLE|SOS|SRD|SSP|STN|SVC|SYP|SZL|THB|TJS|TMT|TND|TOP|TRY|TTD|TWD|TZS|UAH|UGX|USD|USN|UYI|UYU|UYW|UZS|VED|VES|VND|VUV|WST|XAD|XAF|XAG|XAU|XBA|XBB|XBC|XBD|XCD|XCG|XDR|XOF|XPD|XPF|XPT|XSU|XTS|XUA|XXX|YER|ZAR|ZMW|ZWG)$/,dr=/^[A-Z]{2}(?!00|01|99)\d{2}[A-Z0-9]{11,30}$/,Yl="(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))";function pv(e){return new RegExp(`^${e}$`)}var Go=pv(Yl);function Io(e){let n="(?:[01]\\d|2[0-3]):[0-5]\\d";return typeof e.precision=="number"?e.precision===-1?`${n}`:e.precision===0?`${n}:[0-5]\\d`:`${n}:[0-5]\\d\\.\\d{${e.precision}}`:e.seconds?`${n}:[0-5]\\d(?:\\.\\d+)?`:`${n}(?::[0-5]\\d(?:\\.\\d+)?)?`}function Xo(e){return new RegExp(`^${Io(e)}$`)}function qo(e){let n=["Z"];e.offset&&n.push("([+-](?:[01]\\d|2[0-3]):[0-5]\\d)");let i=`${Io({precision:e.precision,seconds:!0})}(?:${n.join("|")})`,o=e.local?`${i}|${Io({precision:e.precision})}`:i;return new RegExp(`^${Yl}T(?:${o})$`)}var Ho=/^[\s\S]{0,}$/,Yo=e=>{let n=e?`[\\s\\S]{${e?.minimum??0},${e?.maximum??""}}`:"[\\s\\S]*";return new RegExp(`^${n}$`)},Qo=/^-?\d+n?$/,un=/^-?\d+$/,we=/^-?\d+(?:\.\d+)?$/,ea=/^(?:true|false)$/i,ta=/^null$/i;var na=/^undefined$/i;var ra=/^[^A-Z]*$/,ia=/^[^a-z]*$/,oa=/^[0-9a-fA-F]*$/;function sn(e,n){return new RegExp(`^[A-Za-z0-9+/]{${e}}${n}$`)}function ln(e){return new RegExp(`^[A-Za-z0-9_-]{${e}}$`)}var fv=/^[0-9a-fA-F]{32}$/,mv=sn(22,"=="),gv=ln(22),vv=/^[0-9a-fA-F]{40}$/,hv=sn(27,"="),yv=ln(27),bv=/^[0-9a-fA-F]{64}$/,$v=sn(43,"="),_v=ln(43),kv=/^[0-9a-fA-F]{96}$/,xv=sn(64,""),wv=ln(64),Iv=/^[0-9a-fA-F]{128}$/,Sv=sn(86,"=="),zv=ln(86);var R=g("$ZodCheck",(e,n)=>{var i;e._zod??(e._zod={}),e._zod.def=n,(i=e._zod).onattach??(i.onattach=[])}),aa=e=>{let n=e.value;return!Gn(n)&&n.size!==void 0},ca=e=>{let n=e.value;return!Gn(n)&&n.length!==void 0},pr={number:"number",bigint:"bigint",object:"date"},mr=g("$ZodCheckLessThan",(e,n)=>{R.init(e,n);let i=pr[typeof n.value];e._zod.check=o=>{(n.inclusive?o.value<=n.value:o.value<n.value)||o.issues.push({origin:pr[typeof o.value]??i,code:"too_big",maximum:typeof n.value=="object"?n.value.getTime():n.value,input:o.value,inclusive:n.inclusive,inst:e,continue:!n.abort})}}),gr=g("$ZodCheckGreaterThan",(e,n)=>{R.init(e,n);let i=pr[typeof n.value];e._zod.check=o=>{(n.inclusive?o.value>=n.value:o.value>n.value)||o.issues.push({origin:pr[typeof o.value]??i,code:"too_small",minimum:typeof n.value=="object"?n.value.getTime():n.value,input:o.value,inclusive:n.inclusive,inst:e,continue:!n.abort})}}),ua=g("$ZodCheckMultipleOf",(e,n)=>{R.init(e,n),e._zod.check=i=>{if(typeof i.value!=typeof n.value)throw new Error("Cannot mix number and bigint in multiple_of check.");(typeof i.value=="bigint"?n.value!==BigInt(0)&&i.value%n.value===BigInt(0):Gt(i.value,n.value)===0)||i.issues.push({origin:typeof i.value,code:"not_multiple_of",divisor:n.value,input:i.value,inst:e,continue:!n.abort})}}),sa=g("$ZodCheckNumberFormat",(e,n)=>{R.init(e,n),n.format=n.format||"float64";let i=n.format?.includes("int"),o=i?"int":"number",[t,r]=Ht[n.format];e._zod.check=a=>{let c=a.value;if(i){if(!Number.isInteger(c)){a.issues.push({expected:o,format:n.format,code:"invalid_type",continue:!1,input:c,inst:e});return}if(!Number.isSafeInteger(c)){c>0?a.issues.push({input:c,code:"too_big",maximum:Number.MAX_SAFE_INTEGER,note:"Integers must be within the safe integer range.",inst:e,origin:o,inclusive:!0,continue:!n.abort}):a.issues.push({input:c,code:"too_small",minimum:Number.MIN_SAFE_INTEGER,note:"Integers must be within the safe integer range.",inst:e,origin:o,inclusive:!0,continue:!n.abort});return}}c<t&&a.issues.push({origin:"number",input:c,code:"too_small",minimum:t,inclusive:!0,inst:e,continue:!n.abort}),c>r&&a.issues.push({origin:"number",input:c,code:"too_big",maximum:r,inclusive:!0,inst:e,continue:!n.abort})}}),la=g("$ZodCheckBigIntFormat",(e,n)=>{R.init(e,n);let[i,o]=Yt[n.format];e._zod.check=t=>{let r=t.value;r<i&&t.issues.push({origin:"bigint",input:r,code:"too_small",minimum:i,inclusive:!0,inst:e,continue:!n.abort}),r>o&&t.issues.push({origin:"bigint",input:r,code:"too_big",maximum:o,inclusive:!0,inst:e,continue:!n.abort})}}),da=g("$ZodCheckMaxSize",(e,n)=>{var i;R.init(e,n),(i=e._zod.def).when??(i.when=aa),e._zod.check=o=>{let t=o.value;t.size<=n.maximum||o.issues.push({origin:Qt(t),code:"too_big",maximum:n.maximum,inclusive:!0,input:t,inst:e,continue:!n.abort})}}),pa=g("$ZodCheckMinSize",(e,n)=>{var i;R.init(e,n),(i=e._zod.def).when??(i.when=aa),e._zod.check=o=>{let t=o.value;t.size>=n.minimum||o.issues.push({origin:Qt(t),code:"too_small",minimum:n.minimum,inclusive:!0,input:t,inst:e,continue:!n.abort})}}),fa=g("$ZodCheckSizeEquals",(e,n)=>{var i;R.init(e,n),(i=e._zod.def).when??(i.when=aa),e._zod.check=o=>{let t=o.value,r=t.size;if(r===n.size)return;let a=r>n.size;o.issues.push({origin:Qt(t),...a?{code:"too_big",maximum:n.size}:{code:"too_small",minimum:n.size},inclusive:!0,exact:!0,input:o.value,inst:e,continue:!n.abort})}}),ma=g("$ZodCheckMaxLength",(e,n)=>{var i;R.init(e,n),(i=e._zod.def).when??(i.when=ca),e._zod.check=o=>{let t=o.value,r=t.length;if((typeof t=="string"&&r>n.maximum?Me(t):r)<=n.maximum)return;let c=en(t);o.issues.push({origin:c,code:"too_big",maximum:n.maximum,inclusive:!0,input:t,inst:e,continue:!n.abort})}}),ga=g("$ZodCheckMinLength",(e,n)=>{var i;R.init(e,n),(i=e._zod.def).when??(i.when=ca),e._zod.check=o=>{let t=o.value,r=t.length;if((typeof t=="string"&&r>=n.minimum&&r<n.minimum*2?Me(t):r)>=n.minimum)return;let c=en(t);o.issues.push({origin:c,code:"too_small",minimum:n.minimum,inclusive:!0,input:t,inst:e,continue:!n.abort})}}),va=g("$ZodCheckLengthEquals",(e,n)=>{var i;R.init(e,n),(i=e._zod.def).when??(i.when=ca),e._zod.check=o=>{let t=o.value,r=t.length,a=typeof t=="string"&&r>=n.length&&r<=n.length*2?Me(t):r;if(a===n.length)return;let c=en(t),u=a>n.length;o.issues.push({origin:c,...u?{code:"too_big",maximum:n.length}:{code:"too_small",minimum:n.length},inclusive:!0,exact:!0,input:o.value,inst:e,continue:!n.abort})}}),ht=g("$ZodCheckStringFormat",(e,n)=>{var i,o;R.init(e,n),n.pattern?(i=e._zod).check??(i.check=t=>{n.pattern.lastIndex=0,!n.pattern.test(t.value)&&t.issues.push({origin:"string",code:"invalid_format",format:n.format,input:t.value,...n.pattern?{pattern:n.pattern.toString()}:{},inst:e,continue:!n.abort})}):(o=e._zod).check??(o.check=()=>{})}),ha=g("$ZodCheckRegex",(e,n)=>{ht.init(e,n),e._zod.check=i=>{n.pattern.lastIndex=0,!n.pattern.test(i.value)&&i.issues.push({origin:"string",code:"invalid_format",format:"regex",input:i.value,pattern:n.pattern.toString(),inst:e,continue:!n.abort})}}),ya=g("$ZodCheckLowerCase",(e,n)=>{n.pattern??(n.pattern=ra),ht.init(e,n)}),ba=g("$ZodCheckUpperCase",(e,n)=>{n.pattern??(n.pattern=ia),ht.init(e,n)}),$a=g("$ZodCheckIncludes",(e,n)=>{R.init(e,n);let i=de(n.includes),o=new RegExp(typeof n.position=="number"?`^.{${n.position},}${i}`:i);n.pattern=o,e._zod.check=t=>{t.value.includes(n.includes,n.position)||t.issues.push({origin:"string",code:"invalid_format",format:"includes",includes:n.includes,input:t.value,inst:e,continue:!n.abort})}}),_a=g("$ZodCheckStartsWith",(e,n)=>{R.init(e,n);let i=new RegExp(`^${de(n.prefix)}.*`);n.pattern??(n.pattern=i),e._zod.check=o=>{o.value.startsWith(n.prefix)||o.issues.push({origin:"string",code:"invalid_format",format:"starts_with",prefix:n.prefix,input:o.value,inst:e,continue:!n.abort})}}),ka=g("$ZodCheckEndsWith",(e,n)=>{R.init(e,n);let i=new RegExp(`.*${de(n.suffix)}$`);n.pattern??(n.pattern=i),e._zod.check=o=>{o.value.endsWith(n.suffix)||o.issues.push({origin:"string",code:"invalid_format",format:"ends_with",suffix:n.suffix,input:o.value,inst:e,continue:!n.abort})}});function fr(e,n,i){e.issues.length&&n.issues.push(...re(i,e.issues))}var xa=g("$ZodCheckProperty",(e,n)=>{R.init(e,n),e._zod.check=i=>{let o=n.schema._zod.run({value:i.value[n.property],issues:[]},{});if(o instanceof Promise)return o.then(t=>fr(t,i,n.property));fr(o,i,n.property)}}),wa=g("$ZodCheckProperties",(e,n)=>{R.init(e,n),tn(e,Symbol.iterator,function*(){yield e});let i;e._zod.check=o=>{if(o.value==null){o.issues.push({expected:"object",code:"invalid_type",input:o.value,inst:e});return}i??(i=Reflect.ownKeys(n.shape).map(a=>[a,n.shape[a]]));let t=o.value,r;for(let[a,c]of i){let u=c._zod.run({value:t[a],issues:[]},{});u instanceof Promise?(r??(r=[]),r.push(u.then(s=>fr(s,o,a)))):fr(u,o,a)}if(r)return Promise.all(r).then(()=>{})}}),Ia=g("$ZodCheckMimeType",(e,n)=>{R.init(e,n);let i=new Set(n.mime);e._zod.check=o=>{i.has(o.value.type)||o.issues.push({code:"invalid_value",values:n.mime,input:o.value.type,inst:e,continue:!n.abort})}}),Sa=g("$ZodCheckOverwrite",(e,n)=>{R.init(e,n),e._zod.check=i=>{i.value=n.tx(i.value)}});var Je=class{constructor(n=[],i={}){this.content=[],this.indent=0,this.args=n,this.closed=i}indented(n){this.indent+=1;try{n(this)}finally{this.indent-=1}}write(n){if(typeof n=="function"){n(this,{execution:"sync"}),n(this,{execution:"async"});return}let o=n.split(`
`).filter(a=>a),t=Math.min(...o.map(a=>a.length-a.trimStart().length)),r=o.map(a=>a.slice(t)).map(a=>" ".repeat(this.indent*2)+a);for(let a of r)this.content.push(a)}compile(){let n=Function,i=this?.content??[""];return new n(...Object.keys(this.closed),`return function (${this.args.join(", ")}) {
${i.join(`
`)}
};`)(...Object.values(this.closed))}};var za={major:4,minor:6,patch:5};var O=g("$ZodType",(e,n)=>{var i;e??(e={}),e._zod.def=n,e._zod.bag=e._zod.bag||{},e._zod.version=za;let o=e._zod.def.checks,t=e._zod.traits.has("$ZodCheck")?[e,...o??[]]:o?.length?[...o]:[];for(let r of t)for(let a of r._zod.onattach)a(e);if(t.length===0)(i=e._zod).deferred??(i.deferred=[]),e._zod.deferred?.push(()=>{e._zod.run=e._zod.parse});else{let r=(c,u,s)=>{if(c.memo)return c;let l=Q(c),p;for(let f of u){if(f._zod.def.when){if(mo(c)||!f._zod.def.when(c))continue}else if(l)continue;let m=c.issues.length,h=f._zod.check(c);if(h instanceof Promise&&s?.async===!1)throw new oe;if(p||h instanceof Promise)p=(p??Promise.resolve()).then(async()=>{await h,c.issues.length!==m&&(Hn(c.issues,m,e),l||(l=Q(c,m)))});else{if(c.issues.length===m)continue;Hn(c.issues,m,e),l||(l=Q(c,m))}}return p?p.then(()=>c):c},a=(c,u,s)=>{if(Q(c))return c.aborted=!0,c;let l=r(u,t,s);if(l instanceof Promise){if(s.async===!1)throw new oe;return l.then(p=>e._zod.parse(p,s))}return e._zod.parse(l,s)};e._zod.run=(c,u)=>{if(u.skipChecks)return e._zod.parse(c,u);if(u.direction==="backward"){let l=e._zod.parse({value:c.value,issues:[]},{...u,skipChecks:!0});return l instanceof Promise?l.then(p=>a(p,c,u)):a(l,c,u)}let s=e._zod.parse(c,u);if(s instanceof Promise){if(u.async===!1)throw new oe;return s.then(l=>r(l,t,u))}return r(s,t,u)}}},{get"~standard"(){return tn(this,"~standard",$r(this))},set"~standard"(e){Oe(this,"~standard",e)}}),gd=(e,n)=>e.issues.length?{issues:e.issues.map(i=>ie(i,n,M()))}:{value:e.value};async function Pv(e,n){let i={async:!0};return gd(await e._zod.run({value:n,issues:[]},i),i)}function $r(e){return{validate:n=>{let i={async:!1};try{let o=e._zod.run({value:n,issues:[]},i);if(!(o instanceof Promise))return gd(o,i)}catch{}return Pv(e,n)},vendor:"zod",version:1}}var Ke=g("$ZodString",(e,n)=>{O.init(e,n),e._zod.pattern=n.pattern??Ho,e._zod.parse=(i,o)=>{if(n.coerce)try{i.value=String(i.value)}catch{}return typeof i.value=="string"||i.issues.push({expected:"string",code:"invalid_type",input:i.value,inst:e}),i}}),L=g("$ZodStringFormat",(e,n)=>{ht.init(e,n),Ke.init(e,n)}),Oa=g("$ZodGUID",(e,n)=>{n.pattern??(n.pattern=To),L.init(e,n)}),ja=g("$ZodUUID",(e,n)=>{if(n.version){let o={v1:1,v2:2,v3:3,v4:4,v5:5,v6:6,v7:7,v8:8}[n.version];if(o===void 0)throw new Error(`Invalid UUID version: "${n.version}"`);n.pattern??(n.pattern=Fe(o))}else n.pattern??(n.pattern=Fe());L.init(e,n)}),Na=g("$ZodEmail",(e,n)=>{n.pattern??(n.pattern=Ao),L.init(e,n)}),Ea=1,dn=2;function Da(e){try{return typeof URL<"u"&&typeof URL.canParse=="function"?URL.canParse(e):(new URL(e),!0)}catch{return!1}}function _r(e,n){return!("normalize"in n)&&!("hostname"in n)&&!("protocol"in n)?Da(e)||dn:vd(e,n)}function vd(e,n){if(!n.normalize&&n.protocol?.source===cn.source&&!/^https?:\/\//i.test(e))return Ea;try{if(typeof URL<"u"){let i=URL;if(typeof i.parse=="function")return i.parse(e)??dn}return new URL(e)}catch{return dn}}var Ov=/[\t\n\r]/g;function pn(e){return e.replace(Ov,"")}function kr(e,n){return n.lastIndex=0,n.test(e.hostname)}function xr(e,n){return n.lastIndex=0,n.test(e.protocol.endsWith(":")?e.protocol.slice(0,-1):e.protocol)}var Ta=g("$ZodURL",(e,n)=>{L.init(e,n),e._zod.check=i=>{try{let o=i.value.trim(),t=_r(o,n);if(t===Ea){i.issues.push({code:"invalid_format",format:"url",note:"Invalid URL format",input:i.value,inst:e,continue:!n.abort});return}if(t===dn){i.issues.push({code:"invalid_format",format:"url",input:i.value,inst:e,continue:!n.abort});return}if(t===!0){i.value=pn(o);return}n.hostname&&!kr(t,n.hostname)&&i.issues.push({code:"invalid_format",format:"url",note:"Invalid hostname",pattern:n.hostname.source,input:i.value,inst:e,continue:!n.abort}),n.protocol&&!xr(t,n.protocol)&&i.issues.push({code:"invalid_format",format:"url",note:"Invalid protocol",pattern:n.protocol.source,input:i.value,inst:e,continue:!n.abort}),i.value=n.normalize?t.href:pn(o);return}catch{i.issues.push({code:"invalid_format",format:"url",input:i.value,inst:e,continue:!n.abort})}}}),Aa=g("$ZodEmoji",(e,n)=>{n.pattern??(n.pattern=Uo()),L.init(e,n)}),Ua=g("$ZodNanoID",(e,n)=>{if(n.length!==void 0&&(!Number.isInteger(n.length)||n.length<1))throw new Error(`Invalid nanoid length: ${n.length}`);n.pattern??(n.pattern=n.length===void 0?No:Eo(n.length)),L.init(e,n)}),La=g("$ZodCUID",(e,n)=>{n.pattern??(n.pattern=So),L.init(e,n)}),Ca=g("$ZodCUID2",(e,n)=>{n.pattern??(n.pattern=zo),L.init(e,n)}),Za=g("$ZodULID",(e,n)=>{n.pattern??(n.pattern=Po),L.init(e,n)}),Ra=g("$ZodXID",(e,n)=>{n.pattern??(n.pattern=Oo),L.init(e,n)}),Va=g("$ZodKSUID",(e,n)=>{n.pattern??(n.pattern=jo),L.init(e,n)}),Ba=g("$ZodISODateTime",(e,n)=>{n.pattern??(n.pattern=qo(n)),L.init(e,n)}),Ma=g("$ZodISODate",(e,n)=>{n.pattern??(n.pattern=Go),L.init(e,n)}),Fa=g("$ZodISOTime",(e,n)=>{n.pattern??(n.pattern=Xo(n)),L.init(e,n)}),Ja=g("$ZodISODuration",(e,n)=>{n.pattern??(n.pattern=Do),L.init(e,n)}),Ka=g("$ZodIPv4",(e,n)=>{n.pattern??(n.pattern=Lo),L.init(e,n)}),jv=/^[0-9a-fA-F:.]+$/;function fn(e){return jv.test(e)?Da(`http://[${e}]`):!1}var Wa=g("$ZodIPv6",(e,n)=>{n.pattern??(n.pattern=Co),L.init(e,n),e._zod.check=i=>{fn(i.value)||i.issues.push({code:"invalid_format",format:"ipv6",input:i.value,inst:e,continue:!n.abort})}}),Ga=g("$ZodMAC",(e,n)=>{n.pattern??(n.pattern=Zo(n.delimiter)),L.init(e,n)}),Xa=g("$ZodCIDRv4",(e,n)=>{n.pattern??(n.pattern=Ro),L.init(e,n)});function wr(e){let n=e.split("/");if(n.length!==2)return!1;let[i,o]=n;if(!o)return!1;let t=Number(o);return`${t}`!==o||t<0||t>128?!1:fn(i)}var qa=g("$ZodCIDRv6",(e,n)=>{n.pattern??(n.pattern=Vo),L.init(e,n),e._zod.check=i=>{wr(i.value)||i.issues.push({code:"invalid_format",format:"cidrv6",input:i.value,inst:e,continue:!n.abort})}});function mn(e){if(e==="")return!0;if(/\s/.test(e)||e.length%4!==0)return!1;try{return atob(e),!0}catch{return!1}}var Ir=/^[0-9a-zA-Z+/]*={0,2}$/,Ha=g("$ZodBase64",(e,n)=>{n.pattern??(n.pattern=Ir),L.init(e,n),e._zod.check=i=>{mn(i.value)||i.issues.push({code:"invalid_format",format:"base64",input:i.value,inst:e,continue:!n.abort})}}),gn=/^[A-Za-z0-9_-]*$/;function Sr(e){if(!gn.test(e))return!1;let n=e.replace(/[-_]/g,o=>o==="-"?"+":"/"),i=n.padEnd(Math.ceil(n.length/4)*4,"=");return mn(i)}var Ya=g("$ZodBase64URL",(e,n)=>{n.pattern??(n.pattern=gn),L.init(e,n),e._zod.check=i=>{Sr(i.value)||i.issues.push({code:"invalid_format",format:"base64url",input:i.value,inst:e,continue:!n.abort})}}),Qa=g("$ZodE164",(e,n)=>{n.pattern??(n.pattern=Ko),L.init(e,n)}),Nv=/[- ]/g;function Ev(e){let n=e.length,i=1,o=0;for(;n;){let t=e.charCodeAt(--n)-48;i^=1,o+=i?[0,2,4,6,8,1,3,5,7,9][t]:t}return o%10===0}function zr(e){return lr.test(e)?Ev(e.replace(Nv,"")):!1}var ec=g("$ZodCreditCard",(e,n)=>{n.pattern??(n.pattern=lr),L.init(e,n),e._zod.check=i=>{zr(i.value)||i.issues.push({code:"invalid_format",format:"credit_card",input:i.value,inst:e,continue:!n.abort})}});function Dv(e){let n=0,i=e.length;for(let o=4;o<i;o++){let t=e.charCodeAt(o);n=(t>=65?n*100+(t-55):n*10+(t-48))%97}for(let o=0;o<4;o++){let t=e.charCodeAt(o);n=(t>=65?n*100+(t-55):n*10+(t-48))%97}return n===1}function Pr(e){return dr.test(e)?Dv(e):!1}var tc=g("$ZodIBAN",(e,n)=>{n.pattern??(n.pattern=dr),L.init(e,n),e._zod.check=i=>{Pr(i.value)||i.issues.push({code:"invalid_format",format:"iban",input:i.value,inst:e,continue:!n.abort})}});function Or(e,n=null){try{let i=e.split(".");if(i.length!==3)return!1;let[o]=i;if(!o)return!1;let t=JSON.parse(atob(o));return!("typ"in t&&t?.typ!=="JWT"||!t.alg||n&&(!("alg"in t)||t.alg!==n))}catch{return!1}}var nc=g("$ZodJWT",(e,n)=>{L.init(e,n),e._zod.check=i=>{Or(i.value,n.alg)||i.issues.push({code:"invalid_format",format:"jwt",input:i.value,inst:e,continue:!n.abort})}}),rc=g("$ZodCustomStringFormat",(e,n)=>{L.init(e,n),e._zod.check=i=>{n.fn(i.value)||i.issues.push({code:"invalid_format",format:n.format,input:i.value,inst:e,continue:!n.abort})}}),jr=g("$ZodNumber",(e,n)=>{O.init(e,n),e._zod.pattern=we,e._zod.parse=(i,o)=>{if(n.coerce)try{i.value=Number(i.value)}catch{}let t=i.value;if(typeof t=="number"&&!Number.isNaN(t)&&Number.isFinite(t))return i;let r=typeof t=="number"?Number.isNaN(t)?"NaN":Number.isFinite(t)?void 0:String(t):void 0;return i.issues.push({expected:"number",code:"invalid_type",input:t,inst:e,...r?{received:r}:{}}),i}}),ic=g("$ZodNumberFormat",(e,n)=>{sa.init(e,n),jr.init(e,n)}),vn=g("$ZodBoolean",(e,n)=>{O.init(e,n),e._zod.pattern=ea,e._zod.parse=(i,o)=>{if(n.coerce)try{i.value=!!i.value}catch{}let t=i.value;return typeof t=="boolean"||i.issues.push({expected:"boolean",code:"invalid_type",input:t,inst:e}),i}}),Nr=g("$ZodBigInt",(e,n)=>{O.init(e,n),e._zod.pattern=Qo,e._zod.parse=(i,o)=>{if(n.coerce)try{i.value=BigInt(i.value)}catch{}return typeof i.value=="bigint"||i.issues.push({expected:"bigint",code:"invalid_type",input:i.value,inst:e}),i}}),oc=g("$ZodBigIntFormat",(e,n)=>{la.init(e,n),Nr.init(e,n)}),ac=g("$ZodSymbol",(e,n)=>{O.init(e,n),e._zod.parse=(i,o)=>{let t=i.value;return typeof t=="symbol"||i.issues.push({expected:"symbol",code:"invalid_type",input:t,inst:e}),i}}),cc=g("$ZodUndefined",(e,n)=>{O.init(e,n),e._zod.pattern=na,e._zod.values=new Set([void 0]),e._zod.parse=(i,o)=>{let t=i.value;return typeof t>"u"||i.issues.push({expected:"undefined",code:"invalid_type",input:t,inst:e}),i}}),uc=g("$ZodNull",(e,n)=>{O.init(e,n),e._zod.pattern=ta,e._zod.values=new Set([null]),e._zod.parse=(i,o)=>{let t=i.value;return t===null||i.issues.push({expected:"null",code:"invalid_type",input:t,inst:e}),i}}),sc=g("$ZodAny",(e,n)=>{O.init(e,n),e._zod.parse=i=>i}),lc=g("$ZodUnknown",(e,n)=>{O.init(e,n),e._zod.parse=i=>i}),dc=g("$ZodNever",(e,n)=>{O.init(e,n),e._zod.parse=(i,o)=>(i.issues.push({expected:"never",code:"invalid_type",input:i.value,inst:e}),i)}),pc=g("$ZodVoid",(e,n)=>{O.init(e,n),e._zod.parse=(i,o)=>{let t=i.value;return typeof t>"u"||i.issues.push({expected:"void",code:"invalid_type",input:t,inst:e}),i}}),fc=g("$ZodDate",(e,n)=>{O.init(e,n),e._zod.parse=(i,o)=>{if(n.coerce)try{i.value=new Date(i.value)}catch{}let t=i.value,r=t instanceof Date;return r&&!Number.isNaN(t.getTime())||i.issues.push({expected:"date",code:"invalid_type",input:t,...r?{received:"Invalid Date"}:{},inst:e}),i}});function ed(e,n,i){e.issues.length&&n.issues.push(...re(i,e.issues)),n.value[i]=e.value}var mc=g("$ZodArray",(e,n)=>{O.init(e,n);let i=W.memoizer;i?.attach(e),e._zod.parse=(o,t)=>{let r=o.value;if(!Array.isArray(r))return o.issues.push({expected:"array",code:"invalid_type",input:r,inst:e}),o;o.value=i?i.alloc(e,o,Array(r.length),t):Array(r.length);let a=[],c=t?.abortEarly;for(let u=0;u<r.length;u++){let s=r[u],l=n.element._zod.run({value:s,issues:[]},t);if(l instanceof Promise)a.push(l.then(p=>ed(p,o,u)));else if(ed(l,o,u),c&&l.issues.length!==0&&Q(l))break}return a.length?Promise.all(a).then(()=>o):o}});function br(e,n,i,o,t,r){let a=i in o,c=r==="optional";if(!(!a&&c&&t==="optional")){if(e.issues.length){if(t!==void 0&&c&&!a)return;n.issues.push(...re(i,e.issues))}if(!a&&t===void 0){e.issues.length||n.issues.push({code:"invalid_type",expected:"nonoptional",input:void 0,path:[i]});return}e.value===void 0?(a||t==="defaulted"&&!c)&&(n.value[i]=void 0):n.value[i]=e.value}}var Tv=[];function hd(e){let n=Object.keys(e.shape),i=Object.getOwnPropertySymbols(e.shape),o=i.length?i:Tv,t=o.length?[...n,...o]:n;for(let a of t)if(!e.shape?.[a]?._zod?.traits?.has("$ZodType"))throw new Error(`Invalid element at key "${String(a)}": expected a Zod schema`);let r=fo(e.shape);return{...e,allKeys:t,symbolKeys:o,keySet:new Set(n),numKeys:n.length,optionalKeys:new Set(r)}}function yd(e,n,i,o,t,r,a){let c=[],u=t.keySet,s=t.catchall._zod,l=s.def.type,p=s.optin,f=s.optout,m=0;for(let h in n){if(a&&i.issues.length!==m){if(Q(i,m))break;m=i.issues.length}if(u.has(h))continue;if(h==="__proto__"){l==="never"&&c.push(h);continue}if(l==="never"){c.push(h);continue}let _=s.run({value:n[h],issues:[]},o);_ instanceof Promise?e.push(_.then(x=>br(x,i,h,n,p,f))):br(_,i,h,n,p,f)}return c.length&&i.issues.push({code:"unrecognized_keys",keys:c,input:n,inst:r,continue:!0}),e.length?Promise.all(e).then(()=>i):i}var bd=g("$ZodObject",(e,n)=>{O.init(e,n);let i=Object.getOwnPropertyDescriptor(n,"shape"),o=i?.get?i.get.raw:n.shape??{};if(o){let s=()=>{let l={...o};return Object.defineProperty(n,"shape",{value:l}),s.raw=l,l};s.raw=o,Object.defineProperty(n,"shape",{get:s})}let t=lt(()=>hd(n));E(e,"propValues",s=>{let l=s.def.shape,p={};for(let f in l){let m=l[f]._zod;if(m.values){Object.prototype.hasOwnProperty.call(p,f)||G(p,f,new Set);for(let h of m.values)p[f].add(h);m.optin!==void 0&&p[f].add(void 0)}}return p});let r=Be,a=n.catchall,c,u=W.memoizer;u?.attach(e),e._zod.parse=(s,l)=>{c??(c=t.value);let p=s.value;if(!r(p))return s.issues.push({expected:"object",code:"invalid_type",input:p,inst:e}),s;s.value=u?u.alloc(e,s,{},l):{};let f=[],m=c.shape,h=l?.abortEarly,_=s.issues.length;for(let x of c.allKeys){if(h&&s.issues.length!==_){if(Q(s,_))break;_=s.issues.length}if(x==="__proto__")continue;let z=m[x],I=z._zod.optin,j=z._zod.optout,A=z._zod.run({value:p[x],issues:[]},l);A instanceof Promise?f.push(A.then(V=>br(V,s,x,p,I,j))):br(A,s,x,p,I,j)}return a?yd(f,p,s,l,t.value,e,h===!0):f.length?Promise.all(f).then(()=>s):s}}),gc=g("$ZodObjectJIT",(e,n)=>{bd.init(e,n);let i=e._zod.parse,o=lt(()=>hd(n)),t=W.memoizer,r=m=>{let h=o.value,_=h.symbolKeys,x=new Je(["payload","ctx"],{shape:m,inst:e,memo:t,syms:_}),z=V=>`shape[${V}]._zod.run({ value: input[${V}], issues: [] }, ctx)`,I=(V,T)=>`
          let ${V}_ab = false;
          for (let i = 0; i < ${V}.issues.length; i++) {
            const iss = ${V}.issues[i];
            iss.path = iss.path ? [${T}, ...iss.path] : [${T}];
            payload.issues.push(iss);
            if (iss.continue !== true) ${V}_ab = true;
          }
          if (${V}_ab && ctx && ctx.abortEarly) {
            payload.value = newResult;
            return payload;
          }`;x.write("const input = payload.value;");let j=Object.create(null),A=0;for(let V of h.allKeys)j[V]=`key_${A++}`;x.write(t?"const newResult = memo.alloc(inst, payload, {}, ctx);":"const newResult = {};");for(let V of h.allKeys){if(V==="__proto__")continue;let T=j[V],q=typeof V=="symbol"?`syms[${_.indexOf(V)}]`:Y(V),Kt=`${q} in input`,Ll=m[V],io=Ll?._zod?.optin,Cl=io!==void 0,rg=Ll?._zod?.optout==="optional";if(x.write(`const ${T} = ${z(q)};`),Cl&&rg){let ig=io==="optional"?`${T}_present`:`${T}.value !== undefined || ${T}_present`;x.write(`
        const ${T}_present = ${Kt};
        if (!${T}.issues.length || ${T}_present) {
          if (${T}.issues.length) {${I(T,q)}
          }

          if (${ig}) {
            newResult[${q}] = ${T}.value;
          }
        }

      `)}else Cl?(x.write(`
        if (${T}.issues.length) {${I(T,q)}
        }
      `),io==="defaulted"?x.write(`newResult[${q}] = ${T}.value;`):x.write(`
        if (${T}.value !== undefined || ${Kt}) {
          newResult[${q}] = ${T}.value;
        }
      `)):x.write(`
        const ${T}_present = ${Kt};
        if (${T}.issues.length) {${I(T,q)}
        }
        if (!${T}_present && !${T}.issues.length) {
          payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: undefined,
            path: [${q}]
          });
          if (ctx && ctx.abortEarly) {
            payload.value = newResult;
            return payload;
          }
        }

        if (${T}_present) {
          newResult[${q}] = ${T}.value;
        }

      `)}return x.write("payload.value = newResult;"),x.write("return payload;"),x.compile()},a,c=Be,u=!W.jitless,l=u&&lo.value,p=n.catchall,f;e._zod.parse=(m,h)=>{f??(f=o.value);let _=m.value;return c(_)?u&&l&&h?.async===!1&&h.jitless!==!0?(a||(a=r(n.shape)),m=a(m,h),p?yd([],_,m,h,f,e,h?.abortEarly===!0):m):i(m,h):(m.issues.push({expected:"object",code:"invalid_type",input:_,inst:e}),m)}});function td(e,n,i,o){for(let r of e)if(r.issues.length===0)return n.value=r.value,n;let t=e.filter(r=>!Q(r));return t.length===1?(n.value=t[0].value,t[0]):(n.issues.push({code:"invalid_union",input:n.value,inst:i,errors:e.map(r=>r.issues.map(a=>ie(a,o,M())))}),n)}var hn=g("$ZodUnion",(e,n)=>{O.init(e,n),E(e,"optin",o=>o.def.options.some(t=>t._zod.optin==="defaulted")?"defaulted":o.def.options.some(t=>t._zod.optin!==void 0)?"optional":void 0),E(e,"optout",o=>o.def.options.some(t=>t._zod.optout==="optional")?"optional":void 0),E(e,"values",o=>{if(o.def.options.every(t=>t._zod.values))return new Set(o.def.options.flatMap(t=>Array.from(t._zod.values)))}),E(e,"pattern",o=>{if(o.def.options.every(t=>t._zod.pattern)){let t=o.def.options.map(r=>r._zod.pattern);return new RegExp(`^(${t.map(r=>xe(r.source)).join("|")})$`)}});let i=n.options.length===1?n.options[0]._zod.run:null;e._zod.parse=(o,t)=>{if(i)return i(o,t);let r=!1,a=[];for(let c of n.options){let u=c._zod.run({value:o.value,issues:[]},t);if(u instanceof Promise)a.push(u),r=!0;else{if(u.issues.length===0)return u;a.push(u)}}return r?Promise.all(a).then(c=>td(c,o,e,t)):td(a,o,e,t)}});function nd(e,n,i,o){let t=[];for(let r=0;r<e.length;r++)e[r].issues.length===0&&t.push(r);return t.length===1?(n.value=e[t[0]].value,n):(t.length===0?n.issues.push({code:"invalid_union",input:n.value,inst:i,errors:e.map(r=>r.issues.map(a=>ie(a,o,M())))}):n.issues.push({code:"invalid_union",input:n.value,inst:i,errors:[],inclusive:!1,matches:t}),n)}var vc=g("$ZodXor",(e,n)=>{hn.init(e,n),n.inclusive=!1;let i=n.options.length===1?n.options[0]._zod.run:null;e._zod.parse=(o,t)=>{if(i)return i(o,t);let r=!1,a=[];for(let c of n.options){let u=c._zod.run({value:o.value,issues:[]},t);u instanceof Promise?(a.push(u),r=!0):a.push(u)}return r?Promise.all(a).then(c=>nd(c,o,e,t)):nd(a,o,e,t)}});function hc(e,n){let i=e._zod,o=i.bag.optionsMap;o||(o=$d(i.def),i.bag.optionsMap=o);let t=o.get(n);if(t===null)throw new Error(`Ambiguous discriminator value "${String(n)}"`);return t}function $d(e){let n=new Map;for(let i of e.options){let o=i._zod.propValues?.[e.discriminator];if(!o||o.size===0)throw new Error(`Invalid discriminated union option at index "${e.options.indexOf(i)}"`);for(let t of o)if(n.has(t)){if(t!==void 0)throw new Error(`Duplicate discriminator value "${String(t)}"`);n.set(t,null)}else n.set(t,i)}return n}var yc=g("$ZodDiscriminatedUnion",(e,n)=>{n.inclusive=!1,hn.init(e,n);let i=e._zod.parse;E(e,"propValues",t=>{let r={},a=0;for(let c of t.def.options){let u=c._zod.propValues;if(!u||Object.keys(u).length===0)throw new Error(`Invalid discriminated union option at index "${t.def.options.indexOf(c)}"`);u[t.def.discriminator]?.has(void 0)&&a++;for(let[s,l]of Object.entries(u)){Object.prototype.hasOwnProperty.call(r,s)||G(r,s,new Set);for(let p of l)r[s].add(p)}}return!t.def.unionFallback&&a>1&&r[t.def.discriminator]?.delete(void 0),r}),n.options.forEach((t,r)=>{let a=dt(t._zod.def);if(a&&!Object.prototype.hasOwnProperty.call(a,n.discriminator))throw new Error(`Invalid discriminated union option at index "${r}"`)});let o=lt(()=>$d(n));e._zod.parse=(t,r)=>{let a=t.value;if(!Be(a))return t.issues.push({code:"invalid_type",expected:"object",input:a,inst:e}),t;let c=a?.[n.discriminator],u=o.value.get(c);return u&&(c!==void 0||r.direction!=="backward")?u._zod.run(t,r):n.unionFallback||r.direction==="backward"?i(t,r):(t.issues.push({code:"invalid_union",errors:[],note:"No matching discriminator",discriminator:n.discriminator,options:Array.from(o.value.keys()).filter(s=>o.value.get(s)!==null),input:a,path:[n.discriminator],inst:e}),t)}}),bc=g("$ZodIntersection",(e,n)=>{O.init(e,n),e._zod.parse=(i,o)=>{let t=i.value,r=n.left._zod.run({value:t,issues:[]},o),a=n.right._zod.run({value:t,issues:[]},o);return r instanceof Promise||a instanceof Promise?Promise.all([r,a]).then(([u,s])=>rd(i,u,s)):rd(i,r,a)}});function yt(e,n){if(e===n)return{valid:!0,data:e};if(e instanceof Date&&n instanceof Date&&+e==+n)return{valid:!0,data:e};if(le(e)&&le(n)){let i=Object.keys(n),o=Object.keys(e).filter(r=>i.indexOf(r)!==-1),t={...e,...n};Object.prototype.hasOwnProperty.call(t,"__proto__")&&delete t.__proto__;for(let r of o){if(r==="__proto__")continue;let a=yt(e[r],n[r]);if(!a.valid)return{valid:!1,mergeErrorPath:[r,...a.mergeErrorPath]};t[r]=a.data}return{valid:!0,data:t}}if(Array.isArray(e)&&Array.isArray(n)){if(e.length!==n.length)return{valid:!1,mergeErrorPath:[]};let i=[];for(let o=0;o<e.length;o++){let t=e[o],r=n[o],a=yt(t,r);if(!a.valid)return{valid:!1,mergeErrorPath:[o,...a.mergeErrorPath]};i.push(a.data)}return{valid:!0,data:i}}return{valid:!1,mergeErrorPath:[]}}function rd(e,n,i){let o=new Map,t,r=new Map,a=(s,l)=>{let p;if(s.code==="unrecognized_keys"&&!s.path?.length)t??(t=s),p=s.keys;else if(s.code==="invalid_key"&&s.origin==="record"&&s.path?.length===1){let f=String(s.path[0]);r.has(f)||r.set(f,s),p=[f]}else return!1;for(let f of p)o.has(f)||o.set(f,{}),o.get(f)[l]=!0;return!0};for(let s of n.issues)a(s,"l")||e.issues.push(s);for(let s of i.issues)a(s,"r")||e.issues.push(s);let c=[...o].filter(([,s])=>s.l&&s.r).map(([s])=>s);if(c.length){let s=t?c.filter(l=>t.keys.includes(l)):[];s.length&&e.issues.push({...t,keys:s});for(let l of c)!s.includes(l)&&r.has(l)&&e.issues.push(r.get(l))}let u=yt(n.value,i.value);if(!u.valid){if(Q(e))return e;throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(u.mergeErrorPath)}`)}return e.value=u.data,e}var Er=g("$ZodTuple",(e,n)=>{O.init(e,n);let i=n.items,o=W.memoizer;o?.attach(e),e._zod.parse=(t,r)=>{let a=t.value;if(!Array.isArray(a))return t.issues.push({input:a,inst:e,expected:"tuple",code:"invalid_type"}),t;t.value=o?o.alloc(e,t,[],r):[];let c=[],u=id(i,"optin"),s=id(i,"optout");if(!n.rest){if(a.length<u)return t.issues.push({code:"too_small",minimum:u,inclusive:!0,input:a,inst:e,origin:"array"}),t;a.length>i.length&&t.issues.push({code:"too_big",maximum:i.length,inclusive:!0,input:a,inst:e,origin:"array"})}let l=new Array(i.length),p=n.rest?r?.abortEarly:void 0,f=!1;for(let m=0;m<i.length;m++){let h=i[m]._zod.run({value:a[m],issues:[]},r);h instanceof Promise?c.push(h.then(_=>{l[m]=_})):(l[m]=h,p&&!f&&h.issues.length&&(f=Q(h)))}if(n.rest&&!f){let m=i.length-1,h=a.slice(i.length),_=t.issues.length;for(let x of h){if(p&&t.issues.length!==_){if(Q(t,_))break;_=t.issues.length}m++;let z=n.rest._zod.run({value:x,issues:[]},r);z instanceof Promise?c.push(z.then(I=>od(I,t,m))):od(z,t,m)}}return c.length?Promise.all(c).then(()=>ad(l,t,i,a,s)):ad(l,t,i,a,s)}});function id(e,n){for(let i=e.length-1;i>=0;i--)if(!(n==="optin"?e[i]._zod.optin!==void 0:e[i]._zod.optout==="optional"))return i+1;return 0}function od(e,n,i){e.issues.length&&n.issues.push(...re(i,e.issues)),n.value[i]=e.value}function ad(e,n,i,o,t){for(let r=0;r<i.length;r++){let a=e[r],c=r<o.length;if(!c&&r>=t&&i[r]._zod.optin==="optional"){n.value.length=r;break}if(a.issues.length){if(!c&&r>=t){n.value.length=r;break}n.issues.push(...re(r,a.issues))}n.value[r]=a.value}for(let r=n.value.length-1;r>=o.length&&(i[r]._zod.optout==="optional"&&n.value[r]===void 0);r--)n.value.length=r;return n}var $c=g("$ZodRecord",(e,n)=>{O.init(e,n);let i=W.memoizer;i?.attach(e),e._zod.parse=(o,t)=>{let r=o.value;if(!le(r))return o.issues.push({expected:"record",code:"invalid_type",input:r,inst:e}),o;let a=[],c=n.keyType._zod.values;if(c&&!n.partial){o.value=i?i.alloc(e,o,{},t):{};let u=new Set;for(let l of c)if(typeof l=="string"||typeof l=="number"||typeof l=="symbol"){if(u.add(typeof l=="number"?l.toString():l),l==="__proto__")continue;let p=n.keyType._zod.run({value:l,issues:[]},t);if(p instanceof Promise)throw new Error("Async schemas not supported in object keys currently");if(p.issues.length){o.issues.push({code:"invalid_key",origin:"record",issues:p.issues.map(h=>ie(h,t,M())),input:l,path:[l],inst:e});continue}let f=p.value;if(f==="__proto__")continue;let m=n.valueType._zod.run({value:r[l],issues:[]},t);m instanceof Promise?a.push(m.then(h=>{h.issues.length&&o.issues.push(...re(l,h.issues)),o.value[f]=h.value})):(m.issues.length&&o.issues.push(...re(l,m.issues)),o.value[f]=m.value)}let s;for(let l in r)if(!u.has(l))if(n.mode==="loose"){if(l==="__proto__")continue;o.value[l]=r[l]}else s=s??[],s.push(l);s&&s.length>0&&o.issues.push({code:"unrecognized_keys",input:r,inst:e,keys:s,continue:!0})}else{o.value=i?i.alloc(e,o,{},t):{};let u;for(let s of Reflect.ownKeys(r)){if(s==="__proto__"||!Object.prototype.propertyIsEnumerable.call(r,s))continue;let l=n.keyType._zod.run({value:s,issues:[]},t);if(l instanceof Promise)throw new Error("Async schemas not supported in object keys currently");if(typeof s=="string"&&we.test(s)&&l.issues.length){let h=n.keyType._zod.run({value:Number(s),issues:[]},t);if(h instanceof Promise)throw new Error("Async schemas not supported in object keys currently");h.issues.length===0&&(l=h)}if(l.issues.length){n.mode==="loose"?o.value[s]=r[s]:c?(u=u??[],u.push(s)):o.issues.push({code:"invalid_key",origin:"record",issues:l.issues.map(h=>ie(h,t,M())),input:s,path:[s],inst:e});continue}let f=l.value;if(f==="__proto__")continue;let m=n.valueType._zod.run({value:r[s],issues:[]},t);m instanceof Promise?a.push(m.then(h=>{h.issues.length&&o.issues.push(...re(s,h.issues)),o.value[f]=h.value})):(m.issues.length&&o.issues.push(...re(s,m.issues)),o.value[f]=m.value)}u&&u.length>0&&o.issues.push({code:"unrecognized_keys",input:r,inst:e,keys:u,continue:!0})}return a.length?Promise.all(a).then(()=>o):o}}),_c=g("$ZodMap",(e,n)=>{O.init(e,n);let i=W.memoizer;i?.attach(e),e._zod.parse=(o,t)=>{let r=o.value;if(!(r instanceof Map))return o.issues.push({expected:"map",code:"invalid_type",input:r,inst:e}),o;let a=[];o.value=i?i.alloc(e,o,new Map,t):new Map;let c=t?.abortEarly,u=o.issues.length;for(let[s,l]of r){if(c&&o.issues.length!==u){if(Q(o,u))break;u=o.issues.length}let p=n.keyType._zod.run({value:s,issues:[]},t),f=n.valueType._zod.run({value:l,issues:[]},t);p instanceof Promise||f instanceof Promise?a.push(Promise.all([p,f]).then(([m,h])=>{cd(m,h,o,s,r,e,t)})):cd(p,f,o,s,r,e,t)}return a.length?Promise.all(a).then(()=>o):o}});function cd(e,n,i,o,t,r,a){e.issues.length&&(qt.has(typeof o)?i.issues.push(...re(o,e.issues)):i.issues.push({code:"invalid_key",origin:"map",input:t,inst:r,issues:e.issues.map(c=>ie(c,a,M()))})),n.issues.length&&(qt.has(typeof o)?i.issues.push(...re(o,n.issues)):i.issues.push({origin:"map",code:"invalid_element",input:t,inst:r,key:o,issues:n.issues.map(c=>ie(c,a,M()))})),i.value.set(e.value,n.value)}var kc=g("$ZodSet",(e,n)=>{O.init(e,n);let i=W.memoizer;i?.attach(e),e._zod.parse=(o,t)=>{let r=o.value;if(!(r instanceof Set))return o.issues.push({input:r,inst:e,expected:"set",code:"invalid_type"}),o;let a=[];o.value=i?i.alloc(e,o,new Set,t):new Set;let c=t?.abortEarly,u=o.issues.length;for(let s of r){if(c&&o.issues.length!==u){if(Q(o,u))break;u=o.issues.length}let l=n.valueType._zod.run({value:s,issues:[]},t);l instanceof Promise?a.push(l.then(p=>ud(p,o))):ud(l,o)}return a.length?Promise.all(a).then(()=>o):o}});function ud(e,n){e.issues.length&&n.issues.push(...e.issues),n.value.add(e.value)}var xc=g("$ZodEnum",(e,n)=>{O.init(e,n);let i=ut(n.entries),o=new Set(i);e._zod.values=o,E(e,"pattern",t=>{let r=ut(t.def.entries).filter(a=>qt.has(typeof a));return new RegExp(r.length?`^(${r.map(a=>de(a.toString())).join("|")})$`:"^[^\\s\\S]$")}),e._zod.parse=(t,r)=>{let a=t.value;return o.has(a)||t.issues.push({code:"invalid_value",values:i,input:a,inst:e}),t}}),wc=g("$ZodLiteral",(e,n)=>{O.init(e,n);let i=new Set(n.values);e._zod.values=i,E(e,"pattern",o=>{let t=o.def.values;return new RegExp(t.length?`^(${t.map(r=>typeof r=="string"?de(r):r?de(r.toString()):String(r)).join("|")})$`:"^[^\\s\\S]$")}),e._zod.parse=(o,t)=>{let r=o.value;return i.has(r)||o.issues.push({code:"invalid_value",values:n.values,input:r,inst:e}),o}}),Ic=g("$ZodFile",(e,n)=>{O.init(e,n),e._zod.parse=(i,o)=>{let t=i.value;return t instanceof File||i.issues.push({expected:"file",code:"invalid_type",input:t,inst:e}),i}}),Sc=g("$ZodTransform",(e,n)=>{O.init(e,n),e._zod.optin="optional",W.memoizer?.guard(e),e._zod.parse=(i,o)=>{if(o.direction==="backward")throw new je(e.constructor.name);let t=n.transform(i.value,i);if(o.async)return(t instanceof Promise?t:Promise.resolve(t)).then(a=>(i.value=a,i));if(t instanceof Promise)throw new oe;return i.value=t,i}});function sd(e,n){return e.value=n.issues.length?void 0:n.value,e}var Dr=g("$ZodOptional",(e,n)=>{O.init(e,n),E(e,"optin",i=>i.def.innerType._zod.optin==="defaulted"?"defaulted":"optional"),e._zod.optout="optional",E(e,"values",i=>{let o=i.def.innerType._zod.values;return o?new Set([...o,void 0]):void 0}),E(e,"pattern",i=>{let o=i.def.innerType._zod.pattern;return o?new RegExp(`^(${xe(o.source)})?$`):void 0}),e._zod.parse=(i,o)=>{if(i.value===void 0){if(n.innerType._zod.optin!=="defaulted")return i;let t=n.innerType._zod.run({value:i.value,issues:[]},o);return t instanceof Promise?t.then(r=>sd(i,r)):sd(i,t)}return n.innerType._zod.run(i,o)}}),zc=g("$ZodExactOptional",(e,n)=>{Dr.init(e,n),E(e,"values",i=>i.def.innerType._zod.values),E(e,"pattern",i=>i.def.innerType._zod.pattern),e._zod.parse=(i,o)=>n.innerType._zod.run(i,o)}),Pc=g("$ZodNullable",(e,n)=>{O.init(e,n),E(e,"optin",i=>i.def.innerType._zod.optin),E(e,"optout",i=>i.def.innerType._zod.optout),E(e,"pattern",i=>{let o=i.def.innerType._zod.pattern;return o?new RegExp(`^(${xe(o.source)}|null)$`):void 0}),E(e,"values",i=>i.def.innerType._zod.values?new Set([...i.def.innerType._zod.values,null]):void 0),e._zod.parse=(i,o)=>i.value===null?i:n.innerType._zod.run(i,o)}),Oc=g("$ZodDefault",(e,n)=>{O.init(e,n),e._zod.optin="defaulted",E(e,"values",i=>i.def.innerType._zod.values),e._zod.parse=(i,o)=>{if(o.direction==="backward")return n.innerType._zod.run(i,o);if(i.value===void 0)return i.value=n.defaultValue,i;let t=n.innerType._zod.run(i,o);return t instanceof Promise?t.then(r=>ld(r,n)):ld(t,n)}});function ld(e,n){return e.value===void 0&&(e.value=n.defaultValue),e}var jc=g("$ZodPrefault",(e,n)=>{O.init(e,n),e._zod.optin="defaulted",E(e,"values",i=>i.def.innerType._zod.values),e._zod.parse=(i,o)=>(o.direction==="backward"||i.value===void 0&&(i.value=n.defaultValue),n.innerType._zod.run(i,o))}),Nc=g("$ZodNonOptional",(e,n)=>{O.init(e,n),E(e,"values",i=>{let o=i.def.innerType._zod.values;return o?new Set([...o].filter(t=>t!==void 0)):void 0}),e._zod.parse=(i,o)=>{let t=n.innerType._zod.run(i,o);return t instanceof Promise?t.then(r=>dd(r,e)):dd(t,e)}});function dd(e,n){return!e.issues.length&&e.value===void 0&&e.issues.push({code:"invalid_type",expected:"nonoptional",input:e.value,inst:n}),e}var Ec=g("$ZodSuccess",(e,n)=>{O.init(e,n),e._zod.parse=(i,o)=>{if(o.direction==="backward")throw new je("ZodSuccess");let t=n.innerType._zod.run(i,o);return t instanceof Promise?t.then(r=>(i.value=r.issues.length===0,i)):(i.value=t.issues.length===0,i)}});function pd(e,n,i,o){return n.issues.length?(e.value=i.catchValue({...n,value:e.value,error:{issues:n.issues.map(t=>ie(t,o,M()))},input:e.value}),e):(e.value=n.value,n.memo&&(e.memo=!0),e)}var Dc=g("$ZodCatch",(e,n)=>{O.init(e,n),E(e,"optin",i=>i.def.innerType._zod.optin==="defaulted"?"defaulted":"optional"),E(e,"optout",i=>i.def.innerType._zod.optout),E(e,"values",i=>i.def.innerType._zod.values),e._zod.parse=(i,o)=>{if(o.direction==="backward")return n.innerType._zod.run(i,o);let t=n.innerType._zod.run({value:i.value,issues:[]},o);return t instanceof Promise?t.then(r=>pd(i,r,n,o)):pd(i,t,n,o)}}),Tc=g("$ZodNaN",(e,n)=>{O.init(e,n),e._zod.parse=(i,o)=>((typeof i.value!="number"||!Number.isNaN(i.value))&&i.issues.push({input:i.value,inst:e,expected:"nan",code:"invalid_type"}),i)}),Tr=g("$ZodPipe",(e,n)=>{O.init(e,n),E(e,"values",i=>i.def.in._zod.values),E(e,"optin",i=>i.def.in._zod.optin),E(e,"optout",i=>i.def.out._zod.optout),E(e,"propValues",i=>i.def.in._zod.propValues),e._zod.parse=(i,o)=>{if(o.direction==="backward"){let r=n.out._zod.run(i,o);return r instanceof Promise?r.then(a=>vr(a,n.in,o)):vr(r,n.in,o)}let t=n.in._zod.run(i,o);return t instanceof Promise?t.then(r=>vr(r,n.out,o)):vr(t,n.out,o)}});function vr(e,n,i){return e.issues.some(o=>o.code!=="unrecognized_keys")?(e.aborted=!0,e):n._zod.run({value:e.value,issues:e.issues},i)}var yn=g("$ZodCodec",(e,n)=>{O.init(e,n),E(e,"values",i=>i.def.in._zod.values),E(e,"optin",i=>i.def.in._zod.optin),E(e,"optout",i=>i.def.out._zod.optout),E(e,"propValues",i=>i.def.in._zod.propValues),e._zod.parse=(i,o)=>{if((o.direction||"forward")==="forward"){let r=n.in._zod.run(i,o);return r instanceof Promise?r.then(a=>hr(a,n,o)):hr(r,n,o)}else{let r=n.out._zod.run(i,o);return r instanceof Promise?r.then(a=>hr(a,n,o)):hr(r,n,o)}}});function hr(e,n,i){if(e.issues.length)return e.aborted=!0,e;if((i.direction||"forward")==="forward"){let t=n.transform(e.value,e);return t instanceof Promise?t.then(r=>yr(e,r,n.out,i)):yr(e,t,n.out,i)}else{let t=n.reverseTransform(e.value,e);return t instanceof Promise?t.then(r=>yr(e,r,n.in,i)):yr(e,t,n.in,i)}}function yr(e,n,i,o){return e.issues.length?(e.aborted=!0,e):i._zod.run({value:n,issues:e.issues},o)}var Ac=g("$ZodPreprocess",(e,n)=>{Tr.init(e,n)}),Uc=g("$ZodReadonly",(e,n)=>{O.init(e,n),E(e,"propValues",i=>i.def.innerType._zod.propValues),E(e,"values",i=>i.def.innerType._zod.values),E(e,"optin",i=>i.def.innerType?._zod?.optin),E(e,"optout",i=>i.def.innerType?._zod?.optout),e._zod.parse=(i,o)=>{if(o.direction==="backward")return n.innerType._zod.run(i,o);let t=n.innerType._zod.run(i,o);return t instanceof Promise?t.then(fd):fd(t)}});function fd(e){return e.memo||(e.value=Object.freeze(e.value)),e}function Av(e){let n=e._zod.def,i=n.pattern,o=!!n.format?.includes("int"),t,r;for(let c of n.checks??[]){let u=c._zod.def;u.pattern&&(i=u.pattern),o||(o=!!u.format?.includes("int"));let s=u.minimum??u.length,l=u.maximum??u.length;s!==void 0&&(t===void 0||s>t)&&(t=s),l!==void 0&&(r===void 0||l<r)&&(r=l)}if(i)return i.source;if(t!==void 0&&r!==void 0&&t>r)return"(?!)";if(t!==void 0||r!==void 0)return Yo({minimum:t,maximum:r}).source;let a=e._zod.pattern;return(o&&a===we?un:a)?.source}function Pa(e){let n=e._zod.def,i=e._zod.pattern?.source,o=n.innerType??e._zod.innerType;if(o){let t=o._zod.pattern?.source,r=Pa(o);return i&&t&&r&&r!==t?i.replace(xe(t),()=>xe(r)):i}if(n.options){let t=n.options.map(Pa);if(t.every(Boolean))return`^(${t.map(r=>xe(r)).join("|")})$`}return Av(e)}var Lc=g("$ZodTemplateLiteral",(e,n)=>{O.init(e,n);let i=[];for(let o of n.parts)if(typeof o=="object"&&o!==null){let t=Pa(o);if(!t)throw new Error(`Invalid template literal part, no pattern found: ${[...o._zod.traits].shift()}`);i.push(xe(t))}else if(o===null||po.has(typeof o))i.push(de(`${o}`));else throw new Error(`Invalid template literal part: ${o}`);e._zod.pattern=new RegExp(`^${i.join("")}$`),e._zod.parse=(o,t)=>typeof o.value!="string"?(o.issues.push({input:o.value,inst:e,expected:"string",code:"invalid_type"}),o):(e._zod.pattern.lastIndex=0,e._zod.pattern.test(o.value)||o.issues.push({input:o.value,inst:e,code:"invalid_format",format:n.format??"template_literal",pattern:e._zod.pattern.source}),o)}),Cc=g("$ZodFunction",(e,n)=>(O.init(e,n),Object.defineProperty(e,"_def",{value:n}),e._zod.def=n,e.implement=i=>{if(typeof i!="function")throw new Error("implement() must be called with a function");return Object.defineProperty(function(...o){let t=e._def.input?er(e._def.input,o):o,r=Reflect.apply(i,this,t);return e._def.output?er(e._def.output,r):r},"_zod",{value:e._zod,enumerable:!1})},e.implementAsync=i=>{if(typeof i!="function")throw new Error("implementAsync() must be called with a function");return Object.defineProperty(async function(...o){let t=e._def.input?await tr(e._def.input,o):o,r=await Reflect.apply(i,this,t);return e._def.output?await tr(e._def.output,r):r},"_zod",{value:e._zod,enumerable:!1})},e._zod.parse=(i,o)=>typeof i.value!="function"?(i.issues.push({code:"invalid_type",expected:"function",input:i.value,inst:e}),i):(e._def.output&&e._def.output._zod.def.type==="promise"?i.value=e.implementAsync(i.value):i.value=e.implement(i.value),i),e.input=(...i)=>{let o=e.constructor;return Array.isArray(i[0])?new o({type:"function",input:new Er({type:"tuple",items:i[0],rest:i[1]}),output:e._def.output}):new o({type:"function",input:i[0],output:e._def.output})},e.output=i=>{let o=e.constructor;return new o({type:"function",input:e._def.input,output:i})},e)),Zc=g("$ZodPromise",(e,n)=>{O.init(e,n),e._zod.parse=(i,o)=>Promise.resolve(i.value).then(t=>n.innerType._zod.run({value:t,issues:[]},o))}),bn=g("$ZodLazy",(e,n)=>{O.init(e,n),uo(e._zod,"innerType",()=>{let i=n;return i._cachedInner||(i._cachedInner=n.getter()),i._cachedInner}),E(e,"pattern",i=>i.innerType?._zod?.pattern),E(e,"propValues",i=>i.innerType?._zod?.propValues),E(e,"optin",i=>i.innerType?._zod?.optin??void 0),E(e,"optout",i=>i.innerType?._zod?.optout??void 0),e._zod.parse=(i,o)=>e._zod.innerType._zod.run(i,o)}),Rc=g("$ZodCustom",(e,n)=>{R.init(e,n),O.init(e,n),e._zod.parse=(i,o)=>i,e._zod.check=i=>{let o=i.value,t=n.fn(o);if(t instanceof Promise)return t.then(r=>md(r,i,o,e));md(t,i,o,e)}});function md(e,n,i,o){if(!e){let t={code:"custom",input:i,inst:o,path:[...o._zod.def.path??[]],continue:!o._zod.def.abort};o._zod.def.params&&(t.params=o._zod.def.params),n.issues.push(pt(t))}}var Cr=class extends Error{constructor(){super("Cannot parse a reference cycle that closes through a transform"),this.name="ZodCyclicError"}},Bc="~memo",kd=[];function xd(e){return e!==null&&typeof e=="object"}function Vc(e){return e.map(n=>n.path?{...n,path:n.path.slice()}:{...n})}var wd=new WeakMap,bt=0,Lr=1,$n=2;function _n(e,n,i){let o=wd.get(e);if(o!==void 0)return o?$n:bt;if(n.has(e))return $n;n.add(e);let t=bt,r=l=>{if(t!==$n&&l?._zod){let p=_n(l,n,i);p>t&&(t=p)}},a=(l,p)=>{let f=bt;for(let m of Reflect.ownKeys(l)){let h=Object.getOwnPropertyDescriptor(l,m);if(p&&!h.enumerable)continue;let _=h.get?Lr:h.value?._zod?_n(h.value,n,i):bt;_>f&&(f=_)}return f},c=l=>{l>t&&(t=l)},u=e._zod.def,s=u.type;switch(s){case"object":{let l=dt(u);c(l?a(l,!0):Lr),r(u.catchall);break}case"array":r(u.element);break;case"tuple":for(let l of u.items)r(l);r(u.rest);break;case"record":case"map":r(u.keyType),r(u.valueType);break;case"set":r(u.valueType);break;case"union":for(let l of u.options)r(l);break;case"intersection":r(u.left),r(u.right);break;case"optional":case"nullable":case"default":case"prefault":case"catch":case"readonly":case"nonoptional":case"promise":case"success":r(u.innerType);break;case"pipe":r(u.in),r(u.out);break;case"function":r(u.input),r(u.output);break;case"lazy":{let l=u._cachedInner??(i?e._zod.innerType:void 0);c(l?_n(l,n,!1):Lr);break}case"template_literal":case"string":case"number":case"int":case"boolean":case"bigint":case"symbol":case"undefined":case"null":case"void":case"never":case"any":case"unknown":case"date":case"nan":case"enum":case"literal":case"file":case"transform":case"custom":break;default:for(let l in u){let p=Object.getOwnPropertyDescriptor(u,l);if(!p||p.get)continue;let f=p.value;if(!(!f||typeof f!="object")){if(f._zod)r(f);else if(Array.isArray(f))for(let m of f)r(m)}}}return n.delete(e),Uv(e,t)}function Uv(e,n){return n!==Lr&&wd.set(e,n===$n),n}function Zr(e){return _n(e,new Set,!0)!==bt}function Lv(e,n){let i=e.buckets.get(n);return i||(i=new WeakMap,e.buckets.set(n,i)),i}var Ar,Ur=[],Cv={alloc(e,n,i){let o=Ar;if(!o)return i;Ar=void 0;let t={value:i,issues:null};return o.set(n.value,t),Ur.push(t),i},guard(e){var n;(n=e._zod).deferred??(n.deferred=[]),e._zod.deferred.push(()=>{let i=e._zod.parse,o=(t,r)=>{if(r.direction!=="backward"&&Rr(r,t.value))throw new Cr;return i(t,r)};e._zod.parse=o,e._zod.run===i&&(e._zod.run=o)})},attach(e){var n;let i,o=!1,t,r;(n=e._zod).deferred??(n.deferred=[]),e._zod.deferred.push(()=>{let a=e._zod.parse,c=(u,s)=>{if(i===void 0){let z=_n(e,new Set,!1);if(z===bt)return e._zod.parse=a,e._zod.run===c&&(e._zod.run=a),a(u,s);z===$n||o?i=!0:o=!0}let l=u.value;if(!xd(l))return a(u,s);let p=s[Bc];p||(p={buckets:new WeakMap,backEdges:void 0},s[Bc]=p);let f;t===s?f=r:(f=Lv(p,e),t=s,r=f);let m=f.get(l);if(m)return u.value=m.value,m.issues?m.issues.length&&u.issues.push(...Vc(m.issues)):(u.memo=!0,p.backEdges??(p.backEdges=new WeakSet),p.backEdges.add(m.value)),u;Ar=f;let h=Ur.length,_=a(u,s);Ar=void 0;let x=Ur.length>h?Ur.pop():void 0;return _ instanceof Promise?_.then(z=>(x&&(x.issues=z.issues.length?Vc(z.issues):kd),z)):(x&&(x.issues=_.issues.length?Vc(_.issues):kd),_)};e._zod.parse=c,e._zod.run===a&&(e._zod.run=c)})}};function kn(){return Cv}function Rr(e,n){let i=e[Bc]?.backEdges;return i!==void 0&&xd(n)&&i.has(n)}var wn={};_e(wn,{ar:()=>Id,az:()=>Sd,be:()=>Pd,bg:()=>Od,bn:()=>jd,ca:()=>Nd,ckb:()=>Ed,cs:()=>Dd,da:()=>Td,de:()=>Ad,el:()=>Ud,en:()=>Vr,eo:()=>Ld,es:()=>Cd,fa:()=>Zd,fi:()=>Rd,fr:()=>Vd,frCA:()=>Bd,gu:()=>Md,he:()=>Fd,hi:()=>Jd,hr:()=>Kd,hu:()=>Wd,hy:()=>Xd,id:()=>qd,is:()=>Hd,it:()=>Yd,ja:()=>Qd,ka:()=>ep,kh:()=>tp,km:()=>Br,kn:()=>np,ko:()=>rp,lt:()=>op,mk:()=>ap,ms:()=>cp,ne:()=>up,nl:()=>sp,nn:()=>lp,no:()=>dp,ota:()=>pp,pl:()=>mp,ps:()=>fp,pt:()=>gp,ptBR:()=>vp,ro:()=>hp,ru:()=>bp,sk:()=>$p,sl:()=>_p,sv:()=>kp,ta:()=>xp,tg:()=>wp,th:()=>Ip,tk:()=>Sp,tr:()=>zp,ua:()=>Pp,uk:()=>Mr,ur:()=>Op,uz:()=>jp,vi:()=>Np,yo:()=>Tp,zhCN:()=>Ep,zhTW:()=>Dp});var Zv=()=>{let e={string:{unit:"حرف",verb:"أن يحوي"},file:{unit:"بايت",verb:"أن يحوي"},array:{unit:"عنصر",verb:"أن يحوي"},set:{unit:"عنصر",verb:"أن يحوي"},map:{unit:"عنصر",verb:"أن يحوي"}};function n(t){return e[t]??null}let i={regex:"مدخل",email:"بريد إلكتروني",url:"رابط",emoji:"إيموجي",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"تاريخ ووقت بمعيار ISO",date:"تاريخ بمعيار ISO",time:"وقت بمعيار ISO",duration:"مدة بمعيار ISO",ipv4:"عنوان IPv4",ipv6:"عنوان IPv6",mac:"عنوان MAC",cidrv4:"مدى عناوين بصيغة IPv4",cidrv6:"مدى عناوين بصيغة IPv6",base64:"نَص بترميز base64-encoded",base64url:"نَص بترميز base64url-encoded",json_string:"نَص على هيئة JSON",e164:"رقم هاتف بمعيار E.164",credit_card:"رقم بطاقة الائتمان",currency_code:"رمز العملة",iban:"IBAN",jwt:"JWT",template_literal:"مدخل"},o={nan:"NaN"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`مدخلات غير مقبولة: يفترض إدخال instanceof ${t.expected}، ولكن تم إدخال ${c}`:`مدخلات غير مقبولة: يفترض إدخال ${r}، ولكن تم إدخال ${c}`}case"invalid_value":return t.values.length===1?`مدخلات غير مقبولة: يفترض إدخال ${b(t.values[0])}`:`اختيار غير مقبول: يتوقع انتقاء أحد هذه الخيارات: ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?` أكبر من اللازم: يفترض أن تكون ${t.origin??"القيمة"} ${r} ${t.maximum.toString()} ${a.unit??"عنصر"}`:`أكبر من اللازم: يفترض أن تكون ${t.origin??"القيمة"} ${r} ${t.maximum.toString()}`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`أصغر من اللازم: يفترض لـ ${t.origin} أن يكون ${r} ${t.minimum.toString()} ${a.unit}`:`أصغر من اللازم: يفترض لـ ${t.origin} أن يكون ${r} ${t.minimum.toString()}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`نَص غير مقبول: يجب أن يبدأ بـ "${t.prefix}"`:r.format==="ends_with"?`نَص غير مقبول: يجب أن ينتهي بـ "${r.suffix}"`:r.format==="includes"?`نَص غير مقبول: يجب أن يتضمَّن "${r.includes}"`:r.format==="regex"?`نَص غير مقبول: يجب أن يطابق النمط ${r.pattern}`:`${i[r.format]??t.format} غير مقبول`}case"not_multiple_of":return`رقم غير مقبول: يجب أن يكون من مضاعفات ${t.divisor}`;case"unrecognized_keys":return`معرف${t.keys.length>1?"ات":""} غريب${t.keys.length>1?"ة":""}: ${v(t.keys,"، ")}`;case"invalid_key":return`معرف غير مقبول في ${t.origin}`;case"invalid_union":return"مدخل غير مقبول";case"invalid_element":return`مدخل غير مقبول في ${t.origin}`;default:return"مدخل غير مقبول"}}};function Id(){return{localeError:Zv()}}var Rv=()=>{let e={string:{unit:"simvol",verb:"olmalıdır"},file:{unit:"bayt",verb:"olmalıdır"},array:{unit:"element",verb:"olmalıdır"},set:{unit:"element",verb:"olmalıdır"},map:{unit:"element",verb:"olmalıdır"}};function n(t){return e[t]??null}let i={regex:"input",email:"email address",url:"URL",emoji:"emoji",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"ISO datetime",date:"ISO date",time:"ISO time",duration:"ISO duration",ipv4:"IPv4 address",ipv6:"IPv6 address",mac:"MAC address",cidrv4:"IPv4 range",cidrv6:"IPv6 range",base64:"base64-encoded string",base64url:"base64url-encoded string",json_string:"JSON string",e164:"E.164 number",credit_card:"kredit kartı nömrəsi",currency_code:"valyuta kodu",iban:"IBAN",jwt:"JWT",template_literal:"input"},o={nan:"NaN"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`Yanlış dəyər: gözlənilən instanceof ${t.expected}, daxil olan ${c}`:`Yanlış dəyər: gözlənilən ${r}, daxil olan ${c}`}case"invalid_value":return t.values.length===1?`Yanlış dəyər: gözlənilən ${b(t.values[0])}`:`Yanlış seçim: aşağıdakılardan biri olmalıdır: ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`Çox böyük: gözlənilən ${t.origin??"dəyər"} ${r}${t.maximum.toString()} ${a.unit??"element"}`:`Çox böyük: gözlənilən ${t.origin??"dəyər"} ${r}${t.maximum.toString()}`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`Çox kiçik: gözlənilən ${t.origin} ${r}${t.minimum.toString()} ${a.unit}`:`Çox kiçik: gözlənilən ${t.origin} ${r}${t.minimum.toString()}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`Yanlış mətn: "${r.prefix}" ilə başlamalıdır`:r.format==="ends_with"?`Yanlış mətn: "${r.suffix}" ilə bitməlidir`:r.format==="includes"?`Yanlış mətn: "${r.includes}" daxil olmalıdır`:r.format==="regex"?`Yanlış mətn: ${r.pattern} şablonuna uyğun olmalıdır`:`Yanlış ${i[r.format]??t.format}`}case"not_multiple_of":return`Yanlış ədəd: ${t.divisor} ilə bölünə bilən olmalıdır`;case"unrecognized_keys":return`Tanınmayan açar${t.keys.length>1?"lar":""}: ${v(t.keys,", ")}`;case"invalid_key":return`${t.origin} daxilində yanlış açar`;case"invalid_union":return"Yanlış dəyər";case"invalid_element":return`${t.origin} daxilində yanlış dəyər`;default:return"Yanlış dəyər"}}};function Sd(){return{localeError:Rv()}}function zd(e,n,i,o){let t=Math.abs(e),r=t%10,a=t%100;return a>=11&&a<=19?o:r===1?n:r>=2&&r<=4?i:o}var Vv=()=>{let e={string:{unit:{one:"сімвал",few:"сімвалы",many:"сімвалаў"},verb:"мець"},array:{unit:{one:"элемент",few:"элементы",many:"элементаў"},verb:"мець"},set:{unit:{one:"элемент",few:"элементы",many:"элементаў"},verb:"мець"},map:{unit:{one:"элемент",few:"элементы",many:"элементаў"},verb:"мець"},file:{unit:{one:"байт",few:"байты",many:"байтаў"},verb:"мець"}};function n(t){return e[t]??null}let i={regex:"увод",email:"email адрас",url:"URL",emoji:"эмодзі",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"ISO дата і час",date:"ISO дата",time:"ISO час",duration:"ISO працягласць",ipv4:"IPv4 адрас",ipv6:"IPv6 адрас",mac:"MAC адрас",cidrv4:"IPv4 дыяпазон",cidrv6:"IPv6 дыяпазон",base64:"радок у фармаце base64",base64url:"радок у фармаце base64url",json_string:"JSON радок",e164:"нумар E.164",credit_card:"нумар крэдытнай карты",currency_code:"код валюты",iban:"IBAN",jwt:"JWT",template_literal:"увод"},o={nan:"NaN",number:"лік",array:"масіў"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`Няправільны ўвод: чакаўся instanceof ${t.expected}, атрымана ${c}`:`Няправільны ўвод: чакаўся ${r}, атрымана ${c}`}case"invalid_value":return t.values.length===1?`Няправільны ўвод: чакалася ${b(t.values[0])}`:`Няправільны варыянт: чакаўся адзін з ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);if(a){let c=Number(t.maximum),u=zd(c,a.unit.one,a.unit.few,a.unit.many);return`Занадта вялікі: чакалася, што ${t.origin??"значэнне"} павінна ${a.verb} ${r}${t.maximum.toString()} ${u}`}return`Занадта вялікі: чакалася, што ${t.origin??"значэнне"} павінна быць ${r}${t.maximum.toString()}`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);if(a){let c=Number(t.minimum),u=zd(c,a.unit.one,a.unit.few,a.unit.many);return`Занадта малы: чакалася, што ${t.origin} павінна ${a.verb} ${r}${t.minimum.toString()} ${u}`}return`Занадта малы: чакалася, што ${t.origin} павінна быць ${r}${t.minimum.toString()}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`Няправільны радок: павінен пачынацца з "${r.prefix}"`:r.format==="ends_with"?`Няправільны радок: павінен заканчвацца на "${r.suffix}"`:r.format==="includes"?`Няправільны радок: павінен змяшчаць "${r.includes}"`:r.format==="regex"?`Няправільны радок: павінен адпавядаць шаблону ${r.pattern}`:`Няправільны ${i[r.format]??t.format}`}case"not_multiple_of":return`Няправільны лік: павінен быць кратным ${t.divisor}`;case"unrecognized_keys":return`Нераспазнаны ${t.keys.length>1?"ключы":"ключ"}: ${v(t.keys,", ")}`;case"invalid_key":return`Няправільны ключ у ${t.origin}`;case"invalid_union":return"Няправільны ўвод";case"invalid_element":return`Няправільнае значэнне ў ${t.origin}`;default:return"Няправільны ўвод"}}};function Pd(){return{localeError:Vv()}}var Bv=()=>{let e={string:{unit:"символа",verb:"да съдържа"},file:{unit:"байта",verb:"да съдържа"},array:{unit:"елемента",verb:"да съдържа"},set:{unit:"елемента",verb:"да съдържа"},map:{unit:"елемента",verb:"да съдържа"}};function n(t){return e[t]??null}let i={regex:"вход",email:"имейл адрес",url:"URL",emoji:"емоджи",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"ISO време",date:"ISO дата",time:"ISO време",duration:"ISO продължителност",ipv4:"IPv4 адрес",ipv6:"IPv6 адрес",mac:"MAC адрес",cidrv4:"IPv4 диапазон",cidrv6:"IPv6 диапазон",base64:"base64-кодиран низ",base64url:"base64url-кодиран низ",json_string:"JSON низ",e164:"E.164 номер",credit_card:"номер на кредитна карта",currency_code:"код на валута",iban:"IBAN",jwt:"JWT",template_literal:"вход"},o={nan:"NaN",number:"число",array:"масив"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`Невалиден вход: очакван instanceof ${t.expected}, получен ${c}`:`Невалиден вход: очакван ${r}, получен ${c}`}case"invalid_value":return t.values.length===1?`Невалиден вход: очакван ${b(t.values[0])}`:`Невалидна опция: очаквано едно от ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`Твърде голямо: очаква се ${t.origin??"стойност"} да съдържа ${r}${t.maximum.toString()} ${a.unit??"елемента"}`:`Твърде голямо: очаква се ${t.origin??"стойност"} да бъде ${r}${t.maximum.toString()}`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`Твърде малко: очаква се ${t.origin} да съдържа ${r}${t.minimum.toString()} ${a.unit}`:`Твърде малко: очаква се ${t.origin} да бъде ${r}${t.minimum.toString()}`}case"invalid_format":{let r=t;if(r.format==="starts_with")return`Невалиден низ: трябва да започва с "${r.prefix}"`;if(r.format==="ends_with")return`Невалиден низ: трябва да завършва с "${r.suffix}"`;if(r.format==="includes")return`Невалиден низ: трябва да включва "${r.includes}"`;if(r.format==="regex")return`Невалиден низ: трябва да съвпада с ${r.pattern}`;let a="Невалиден";return r.format==="emoji"&&(a="Невалидно"),r.format==="datetime"&&(a="Невалидно"),r.format==="date"&&(a="Невалидна"),r.format==="time"&&(a="Невалидно"),r.format==="duration"&&(a="Невалидна"),`${a} ${i[r.format]??t.format}`}case"not_multiple_of":return`Невалидно число: трябва да бъде кратно на ${t.divisor}`;case"unrecognized_keys":return`Неразпознат${t.keys.length>1?"и":""} ключ${t.keys.length>1?"ове":""}: ${v(t.keys,", ")}`;case"invalid_key":return`Невалиден ключ в ${t.origin}`;case"invalid_union":return"Невалиден вход";case"invalid_element":return`Невалидна стойност в ${t.origin}`;default:return"Невалиден вход"}}};function Od(){return{localeError:Bv()}}var Mv=()=>{let e={string:{unit:"অক্ষর",verb:"থাকতে হবে"},file:{unit:"বাইট",verb:"থাকতে হবে"},array:{unit:"আইটেম",verb:"থাকতে হবে"},set:{unit:"আইটেম",verb:"থাকতে হবে"},map:{unit:"এন্ট্রি",verb:"থাকতে হবে"}};function n(t){return e[t]??null}let i={regex:"ইনপুট",email:"ইমেইল ঠিকানা",url:"URL",emoji:"ইমোজি",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"ISO তারিখ ও সময়",date:"ISO তারিখ",time:"ISO সময়",duration:"ISO সময়কাল",ipv4:"IPv4 ঠিকানা",ipv6:"IPv6 ঠিকানা",mac:"MAC ঠিকানা",cidrv4:"IPv4 রেঞ্জ",cidrv6:"IPv6 রেঞ্জ",base64:"base64-এনকোডেড স্ট্রিং",base64url:"base64url-এনকোডেড স্ট্রিং",json_string:"JSON স্ট্রিং",e164:"E.164 নম্বর",credit_card:"ক্রেডিট কার্ড নম্বর",currency_code:"মুদ্রা কোড",iban:"IBAN",jwt:"JWT",template_literal:"ইনপুট"},o={nan:"NaN"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return`অবৈধ ইনপুট: প্রত্যাশিত ${r}, প্রাপ্ত ${c}`}case"invalid_value":return t.values.length===1?`অবৈধ ইনপুট: প্রত্যাশিত ${b(t.values[0])}`:`অবৈধ অপশন: ${v(t.values," | ")} এর মধ্যে একটি প্রত্যাশিত`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`অনেক বড়: ${t.origin??"মান"} ${r}${t.maximum.toString()} ${a.unit??"এলিমেন্ট"} হতে হবে`:`অনেক বড়: ${t.origin??"মান"} ${r}${t.maximum.toString()} হতে হবে`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`অনেক ছোট: ${t.origin} ${r}${t.minimum.toString()} ${a.unit} হতে হবে`:`অনেক ছোট: ${t.origin} ${r}${t.minimum.toString()} হতে হবে`}case"invalid_format":{let r=t;return r.format==="starts_with"?`অবৈধ স্ট্রিং: "${r.prefix}" দিয়ে শুরু হতে হবে`:r.format==="ends_with"?`অবৈধ স্ট্রিং: "${r.suffix}" দিয়ে শেষ হতে হবে`:r.format==="includes"?`অবৈধ স্ট্রিং: "${r.includes}" অন্তর্ভুক্ত থাকতে হবে`:r.format==="regex"?`অবৈধ স্ট্রিং: ${r.pattern} প্যাটার্ন মিলতে হবে`:`অবৈধ ${i[r.format]??t.format}`}case"not_multiple_of":return`অবৈধ নম্বর: ${t.divisor} এর গুণিতক হতে হবে`;case"unrecognized_keys":return`অচেনা কী${t.keys.length>1?"গুলো":""}: ${v(t.keys,", ")}`;case"invalid_key":return`${t.origin} এ অবৈধ কী`;case"invalid_union":return t.options&&Array.isArray(t.options)&&t.options.length>0?`অবৈধ ডিসক্রিমিনেটর মান। প্রত্যাশিত ${t.options.map(a=>`'${a}'`).join(" | ")}`:"অবৈধ ইনপুট";case"invalid_element":return`${t.origin} এ অবৈধ মান`;default:return"অবৈধ ইনপুট"}}};function jd(){return{localeError:Mv()}}var Fv=()=>{let e={string:{unit:"caràcters",verb:"contenir"},file:{unit:"bytes",verb:"contenir"},array:{unit:"elements",verb:"contenir"},set:{unit:"elements",verb:"contenir"},map:{unit:"elements",verb:"contenir"}};function n(t){return e[t]??null}let i={regex:"entrada",email:"adreça electrònica",url:"URL",emoji:"emoji",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"data i hora ISO",date:"data ISO",time:"hora ISO",duration:"durada ISO",ipv4:"adreça IPv4",ipv6:"adreça IPv6",mac:"adreça MAC",cidrv4:"rang IPv4",cidrv6:"rang IPv6",base64:"cadena codificada en base64",base64url:"cadena codificada en base64url",json_string:"cadena JSON",e164:"número E.164",credit_card:"número de targeta de crèdit",currency_code:"codi de moneda",iban:"IBAN",jwt:"JWT",template_literal:"entrada"},o={nan:"NaN"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`Tipus invàlid: s'esperava instanceof ${t.expected}, s'ha rebut ${c}`:`Tipus invàlid: s'esperava ${r}, s'ha rebut ${c}`}case"invalid_value":return t.values.length===1?`Valor invàlid: s'esperava ${b(t.values[0])}`:`Opció invàlida: s'esperava una de ${v(t.values," o ")}`;case"too_big":{let r=t.inclusive?"com a màxim":"menys de",a=n(t.origin);return a?`Massa gran: s'esperava que ${t.origin??"el valor"} contingués ${r} ${t.maximum.toString()} ${a.unit??"elements"}`:`Massa gran: s'esperava que ${t.origin??"el valor"} fos ${r} ${t.maximum.toString()}`}case"too_small":{let r=t.inclusive?"com a mínim":"més de",a=n(t.origin);return a?`Massa petit: s'esperava que ${t.origin} contingués ${r} ${t.minimum.toString()} ${a.unit}`:`Massa petit: s'esperava que ${t.origin} fos ${r} ${t.minimum.toString()}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`Format invàlid: ha de començar amb "${r.prefix}"`:r.format==="ends_with"?`Format invàlid: ha d'acabar amb "${r.suffix}"`:r.format==="includes"?`Format invàlid: ha d'incloure "${r.includes}"`:r.format==="regex"?`Format invàlid: ha de coincidir amb el patró ${r.pattern}`:`Format invàlid per a ${i[r.format]??t.format}`}case"not_multiple_of":return`Número invàlid: ha de ser múltiple de ${t.divisor}`;case"unrecognized_keys":return`Clau${t.keys.length>1?"s":""} no reconeguda${t.keys.length>1?"s":""}: ${v(t.keys,", ")}`;case"invalid_key":return`Clau invàlida a ${t.origin}`;case"invalid_union":return"Entrada invàlida";case"invalid_element":return`Element invàlid a ${t.origin}`;default:return"Entrada invàlida"}}};function Nd(){return{localeError:Fv()}}var Jv=()=>{let e={string:{unit:"پیت",verb:"بێت"},file:{unit:"بایت",verb:"بێت"},array:{unit:"دانە",verb:"بێت"},set:{unit:"دانە",verb:"بێت"},map:{unit:"دانە",verb:"بێت"}};function n(t){return e[t]??null}let i={regex:"regex",email:"ئیمەیڵ",url:"بەستەر (URL)",emoji:"ئیمۆجی",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"ڕێکەوت و کات",date:"ڕێکەوت",time:"کات",duration:"ماوە",ipv4:"ناونیشانی IPv4",ipv6:"ناونیشانی IPv6",mac:"ناونیشانی MAC",cidrv4:"مەودای IPv4",cidrv6:"مەودای IPv6",base64:"دەقی base64",base64url:"دەقی base64url",json_string:"دەقی JSON",e164:"ژمارەی E.164",credit_card:"ژمارەی کارتی کرێدیت",currency_code:"کۆدی دراو",iban:"IBAN",jwt:"JWT",template_literal:"تێکردە"},o={nan:"NaN",string:"نووسین",number:"ژمارە",boolean:"boolean",array:"array",object:"object",date:"ڕێکەوت",integer:"ژمارە",float:"ژمارە",null:"null",undefined:"undefined",function:"function",symbol:"symbol",unknown:"unknown",promise:"promise",void:"void",never:"never",map:"map",set:"set"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a,u=["ا","و","ۆ","وو","ە","ی","ێ"].some(l=>c.endsWith(l))?"یە":"ە",s=/^[a-zA-Z]+$/.test(c);return a==="null"||a==="undefined"?"داواکراوە":`چاوەڕوانکراوە ${r} بێت، بەڵام ${c}${s?"":u}`}case"invalid_value":return t.values.length===1?`بەهاکە نادرووستە: چاوەڕوانکراوە ${b(t.values[0])} بێت`:`هەڵبژاردەی نادروست: چاوەڕوانکراوە یەکێک بێت لە ${v(t.values,"|")}`;case"too_big":{let r=n(t.origin);return r?`پێویستە بە لایەنی زۆرەوە ${t.maximum.toString()} ${r.unit} ${r.verb}`:`پێویستە بە لایەنی زۆرەوە ${t.maximum.toString()} بێت`}case"too_small":{let r=n(t.origin);return r?`پێویستە بە لایەنی کەمەوە ${t.minimum.toString()} ${r.unit} ${r.verb}`:`پێویستە بە لایەنی کەمەوە ${t.minimum.toString()} بێت`}case"invalid_format":{let r=t;return r.format==="starts_with"?`دەقی نادروست: پێویستە دەستپێبکات بە "${r.prefix}"`:r.format==="ends_with"?`دەقی نادروست: پێویستە کۆتاییبێت بە "${r.suffix}"`:r.format==="includes"?`دەقی نادروست: پێویستە "${r.includes}" لەخۆبگرێت`:r.format==="regex"?`دەقی نادروست: پێویستە لەگەڵ پاتێرنی ${r.pattern} بگونجێت`:`بەهای ${i[r.format]??t.format} نادروستە`}case"not_multiple_of":return`ژمارەی نادروست: دەبێت چەند هێندە بێت بۆ ${t.divisor}`;case"unrecognized_keys":return`کلیلی نەناسراو: ${v(t.keys,", ")}`;case"invalid_key":return`کلیلی نادروست لە ${t.origin}`;case"invalid_union":return t.options&&Array.isArray(t.options)&&t.options.length>0?`بەهای نەناسراو هەیە. بەهای چاوەڕوانکراو: ${t.options.map(a=>`'${a}'`).join(" | ")}`:"یەکگرتنی نادروست";case"invalid_element":return`${t.origin} بەهاکە نادروستە`;default:return"تێکردەی نادروست"}}};function Ed(){return{localeError:Jv()}}var Kv=()=>{let e={string:{unit:"znaků",verb:"mít"},file:{unit:"bajtů",verb:"mít"},array:{unit:"prvků",verb:"mít"},set:{unit:"prvků",verb:"mít"},map:{unit:"prvků",verb:"mít"}};function n(t){return e[t]??null}let i={regex:"regulární výraz",email:"e-mailová adresa",url:"URL",emoji:"emoji",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"datum a čas ve formátu ISO",date:"datum ve formátu ISO",time:"čas ve formátu ISO",duration:"doba trvání ISO",ipv4:"IPv4 adresa",ipv6:"IPv6 adresa",mac:"MAC adresa",cidrv4:"rozsah IPv4",cidrv6:"rozsah IPv6",base64:"řetězec zakódovaný ve formátu base64",base64url:"řetězec zakódovaný ve formátu base64url",json_string:"řetězec ve formátu JSON",e164:"číslo E.164",credit_card:"číslo kreditní karty",currency_code:"kód měny",iban:"IBAN",jwt:"JWT",template_literal:"vstup"},o={nan:"NaN",number:"číslo",string:"řetězec",function:"funkce",array:"pole"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`Neplatný vstup: očekáváno instanceof ${t.expected}, obdrženo ${c}`:`Neplatný vstup: očekáváno ${r}, obdrženo ${c}`}case"invalid_value":return t.values.length===1?`Neplatný vstup: očekáváno ${b(t.values[0])}`:`Neplatná možnost: očekávána jedna z hodnot ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`Hodnota je příliš velká: ${t.origin??"hodnota"} musí mít ${r}${t.maximum.toString()} ${a.unit??"prvků"}`:`Hodnota je příliš velká: ${t.origin??"hodnota"} musí být ${r}${t.maximum.toString()}`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`Hodnota je příliš malá: ${t.origin??"hodnota"} musí mít ${r}${t.minimum.toString()} ${a.unit??"prvků"}`:`Hodnota je příliš malá: ${t.origin??"hodnota"} musí být ${r}${t.minimum.toString()}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`Neplatný řetězec: musí začínat na "${r.prefix}"`:r.format==="ends_with"?`Neplatný řetězec: musí končit na "${r.suffix}"`:r.format==="includes"?`Neplatný řetězec: musí obsahovat "${r.includes}"`:r.format==="regex"?`Neplatný řetězec: musí odpovídat vzoru ${r.pattern}`:`Neplatný formát ${i[r.format]??t.format}`}case"not_multiple_of":return`Neplatné číslo: musí být násobkem ${t.divisor}`;case"unrecognized_keys":return`Neznámé klíče: ${v(t.keys,", ")}`;case"invalid_key":return`Neplatný klíč v ${t.origin}`;case"invalid_union":return"Neplatný vstup";case"invalid_element":return`Neplatná hodnota v ${t.origin}`;default:return"Neplatný vstup"}}};function Dd(){return{localeError:Kv()}}var Wv=()=>{let e={string:{unit:"tegn",verb:"havde"},file:{unit:"bytes",verb:"havde"},array:{unit:"elementer",verb:"indeholdt"},set:{unit:"elementer",verb:"indeholdt"},map:{unit:"elementer",verb:"indeholdt"}};function n(t){return e[t]??null}let i={regex:"input",email:"e-mailadresse",url:"URL",emoji:"emoji",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"ISO dato- og klokkeslæt",date:"ISO-dato",time:"ISO-klokkeslæt",duration:"ISO-varighed",ipv4:"IPv4-adresse",ipv6:"IPv6-adresse",mac:"MAC-adresse",cidrv4:"IPv4-spektrum",cidrv6:"IPv6-spektrum",base64:"base64-kodet streng",base64url:"base64url-kodet streng",json_string:"JSON-streng",e164:"E.164-nummer",credit_card:"kreditkortnummer",currency_code:"valutakode",iban:"IBAN",jwt:"JWT",template_literal:"input"},o={nan:"NaN",string:"streng",number:"tal",boolean:"boolean",array:"liste",object:"objekt",set:"sæt",file:"fil"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`Ugyldigt input: forventede instanceof ${t.expected}, fik ${c}`:`Ugyldigt input: forventede ${r}, fik ${c}`}case"invalid_value":return t.values.length===1?`Ugyldig værdi: forventede ${b(t.values[0])}`:`Ugyldigt valg: forventede en af følgende ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin),c=o[t.origin]??t.origin;return a?`For stor: forventede ${c??"value"} ${a.verb} ${r} ${t.maximum.toString()} ${a.unit??"elementer"}`:`For stor: forventede ${c??"value"} havde ${r} ${t.maximum.toString()}`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin),c=o[t.origin]??t.origin;return a?`For lille: forventede ${c} ${a.verb} ${r} ${t.minimum.toString()} ${a.unit}`:`For lille: forventede ${c} havde ${r} ${t.minimum.toString()}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`Ugyldig streng: skal starte med "${r.prefix}"`:r.format==="ends_with"?`Ugyldig streng: skal ende med "${r.suffix}"`:r.format==="includes"?`Ugyldig streng: skal indeholde "${r.includes}"`:r.format==="regex"?`Ugyldig streng: skal matche mønsteret ${r.pattern}`:`Ugyldig ${i[r.format]??t.format}`}case"not_multiple_of":return`Ugyldigt tal: skal være deleligt med ${t.divisor}`;case"unrecognized_keys":return`${t.keys.length>1?"Ukendte nøgler":"Ukendt nøgle"}: ${v(t.keys,", ")}`;case"invalid_key":return`Ugyldig nøgle i ${t.origin}`;case"invalid_union":return"Ugyldigt input: matcher ingen af de tilladte typer";case"invalid_element":return`Ugyldig værdi i ${t.origin}`;default:return"Ugyldigt input"}}};function Td(){return{localeError:Wv()}}var Gv=()=>{let e={string:{unit:"Zeichen",verb:"zu haben"},file:{unit:"Bytes",verb:"zu haben"},array:{unit:"Elemente",verb:"zu haben"},set:{unit:"Elemente",verb:"zu haben"},map:{unit:"Elemente",verb:"zu haben"}};function n(t){return e[t]??null}let i={regex:"Eingabe",email:"E-Mail-Adresse",url:"URL",emoji:"Emoji",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"ISO-Datum und -Uhrzeit",date:"ISO-Datum",time:"ISO-Uhrzeit",duration:"ISO-Dauer",ipv4:"IPv4-Adresse",ipv6:"IPv6-Adresse",mac:"MAC-Adresse",cidrv4:"IPv4-Bereich",cidrv6:"IPv6-Bereich",base64:"Base64-codierter String",base64url:"Base64-URL-codierter String",json_string:"JSON-String",e164:"E.164-Nummer",credit_card:"Kreditkartennummer",currency_code:"Währungscode",iban:"IBAN",jwt:"JWT",template_literal:"Eingabe"},o={nan:"NaN",number:"Zahl",array:"Array"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`Ungültige Eingabe: erwartet instanceof ${t.expected}, erhalten ${c}`:`Ungültige Eingabe: erwartet ${r}, erhalten ${c}`}case"invalid_value":return t.values.length===1?`Ungültige Eingabe: erwartet ${b(t.values[0])}`:`Ungültige Option: erwartet eine von ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`Zu groß: erwartet, dass ${t.origin??"Wert"} ${r}${t.maximum.toString()} ${a.unit??"Elemente"} hat`:`Zu groß: erwartet, dass ${t.origin??"Wert"} ${r}${t.maximum.toString()} ist`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`Zu klein: erwartet, dass ${t.origin} ${r}${t.minimum.toString()} ${a.unit} hat`:`Zu klein: erwartet, dass ${t.origin} ${r}${t.minimum.toString()} ist`}case"invalid_format":{let r=t;return r.format==="starts_with"?`Ungültiger String: muss mit "${r.prefix}" beginnen`:r.format==="ends_with"?`Ungültiger String: muss mit "${r.suffix}" enden`:r.format==="includes"?`Ungültiger String: muss "${r.includes}" enthalten`:r.format==="regex"?`Ungültiger String: muss dem Muster ${r.pattern} entsprechen`:`Ungültig: ${i[r.format]??t.format}`}case"not_multiple_of":return`Ungültige Zahl: muss ein Vielfaches von ${t.divisor} sein`;case"unrecognized_keys":return`${t.keys.length>1?"Unbekannte Schlüssel":"Unbekannter Schlüssel"}: ${v(t.keys,", ")}`;case"invalid_key":return`Ungültiger Schlüssel in ${t.origin}`;case"invalid_union":return"Ungültige Eingabe";case"invalid_element":return`Ungültiger Wert in ${t.origin}`;default:return"Ungültige Eingabe"}}};function Ad(){return{localeError:Gv()}}var Xv=()=>{let e={string:{unit:"χαρακτήρες",verb:"να έχει"},file:{unit:"bytes",verb:"να έχει"},array:{unit:"στοιχεία",verb:"να έχει"},set:{unit:"στοιχεία",verb:"να έχει"},map:{unit:"καταχωρήσεις",verb:"να έχει"}};function n(t){return e[t]??null}let i={regex:"είσοδος",email:"διεύθυνση email",url:"URL",emoji:"emoji",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"ISO ημερομηνία και ώρα",date:"ISO ημερομηνία",time:"ISO ώρα",duration:"ISO διάρκεια",ipv4:"διεύθυνση IPv4",ipv6:"διεύθυνση IPv6",mac:"διεύθυνση MAC",cidrv4:"εύρος IPv4",cidrv6:"εύρος IPv6",base64:"συμβολοσειρά κωδικοποιημένη σε base64",base64url:"συμβολοσειρά κωδικοποιημένη σε base64url",json_string:"συμβολοσειρά JSON",e164:"αριθμός E.164",credit_card:"αριθμός πιστωτικής κάρτας",currency_code:"κωδικός νομίσματος",iban:"IBAN",jwt:"JWT",template_literal:"είσοδος"},o={nan:"NaN"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return typeof t.expected=="string"&&/^[A-Z]/.test(t.expected)?`Μη έγκυρη είσοδος: αναμενόταν instanceof ${t.expected}, λήφθηκε ${c}`:`Μη έγκυρη είσοδος: αναμενόταν ${r}, λήφθηκε ${c}`}case"invalid_value":return t.values.length===1?`Μη έγκυρη είσοδος: αναμενόταν ${b(t.values[0])}`:`Μη έγκυρη επιλογή: αναμενόταν ένα από ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`Πολύ μεγάλο: αναμενόταν ${t.origin??"τιμή"} να έχει ${r}${t.maximum.toString()} ${a.unit??"στοιχεία"}`:`Πολύ μεγάλο: αναμενόταν ${t.origin??"τιμή"} να είναι ${r}${t.maximum.toString()}`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`Πολύ μικρό: αναμενόταν ${t.origin} να έχει ${r}${t.minimum.toString()} ${a.unit}`:`Πολύ μικρό: αναμενόταν ${t.origin} να είναι ${r}${t.minimum.toString()}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`Μη έγκυρη συμβολοσειρά: πρέπει να ξεκινά με "${r.prefix}"`:r.format==="ends_with"?`Μη έγκυρη συμβολοσειρά: πρέπει να τελειώνει με "${r.suffix}"`:r.format==="includes"?`Μη έγκυρη συμβολοσειρά: πρέπει να περιέχει "${r.includes}"`:r.format==="regex"?`Μη έγκυρη συμβολοσειρά: πρέπει να ταιριάζει με το μοτίβο ${r.pattern}`:`Μη έγκυρο: ${i[r.format]??t.format}`}case"not_multiple_of":return`Μη έγκυρος αριθμός: πρέπει να είναι πολλαπλάσιο του ${t.divisor}`;case"unrecognized_keys":return`Άγνωστ${t.keys.length>1?"α":"ο"} κλειδ${t.keys.length>1?"ιά":"ί"}: ${v(t.keys,", ")}`;case"invalid_key":return`Μη έγκυρο κλειδί στο ${t.origin}`;case"invalid_union":return"Μη έγκυρη είσοδος";case"invalid_element":return`Μη έγκυρη τιμή στο ${t.origin}`;default:return"Μη έγκυρη είσοδος"}}};function Ud(){return{localeError:Xv()}}var qv=()=>{let e={string:{unit:"characters",verb:"to have"},file:{unit:"bytes",verb:"to have"},array:{unit:"items",verb:"to have"},set:{unit:"items",verb:"to have"},map:{unit:"entries",verb:"to have"}};function n(r){return e[r]??null}let i={regex:"input",email:"email address",url:"URL",emoji:"emoji",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"ISO datetime",date:"ISO date",time:"ISO time",duration:"ISO duration",ipv4:"IPv4 address",ipv6:"IPv6 address",mac:"MAC address",cidrv4:"IPv4 range",cidrv6:"IPv6 range",base64:"base64-encoded string",base64url:"base64url-encoded string",json_string:"JSON string",e164:"E.164 number",currency_code:"currency code",credit_card:"credit card number",iban:"IBAN",jwt:"JWT",template_literal:"input"},o={nan:"NaN"};function t(r,a){return r==="number"&&typeof a=="number"&&!Number.isFinite(a)?String(a):o[r]??r}return r=>{switch(r.code){case"invalid_type":{let a=t(r.expected),c=$(r.input),u=t(c,r.input);return`Invalid input: expected ${a}, received ${u}`}case"invalid_value":return r.values.length===1?`Invalid input: expected ${b(r.values[0])}`:`Invalid option: expected one of ${v(r.values,"|")}`;case"too_big":{let a=r.exact?"exactly ":r.inclusive?"<=":"<",c=n(r.origin);return c?`Too big: expected ${r.origin??"value"} to have ${a}${r.maximum.toString()} ${c.unit??"elements"}`:`Too big: expected ${r.origin??"value"} to be ${a}${r.maximum.toString()}`}case"too_small":{let a=r.exact?"exactly ":r.inclusive?">=":">",c=n(r.origin);return c?`Too small: expected ${r.origin} to have ${a}${r.minimum.toString()} ${c.unit}`:`Too small: expected ${r.origin} to be ${a}${r.minimum.toString()}`}case"invalid_format":{let a=r;return a.format==="starts_with"?`Invalid string: must start with "${a.prefix}"`:a.format==="ends_with"?`Invalid string: must end with "${a.suffix}"`:a.format==="includes"?`Invalid string: must include "${a.includes}"`:a.format==="regex"?`Invalid string: must match pattern ${a.pattern}`:`Invalid ${i[a.format]??r.format}`}case"not_multiple_of":return`Invalid number: must be a multiple of ${r.divisor}`;case"unrecognized_keys":return`Unrecognized key${r.keys.length>1?"s":""}: ${v(r.keys,", ")}`;case"invalid_key":return`Invalid key in ${r.origin}`;case"invalid_union":return r.options&&Array.isArray(r.options)&&r.options.length>0?`Invalid discriminator value. Expected ${r.options.map(c=>`'${c}'`).join(" | ")}`:r.inclusive===!1?"Invalid input: more than one option matched":"Invalid input";case"invalid_element":return`Invalid value in ${r.origin}`;default:return"Invalid input"}}};function Vr(){return{localeError:qv()}}var Hv=()=>{let e={string:{unit:"karaktrojn",verb:"havi"},file:{unit:"bajtojn",verb:"havi"},array:{unit:"elementojn",verb:"havi"},set:{unit:"elementojn",verb:"havi"},map:{unit:"elementojn",verb:"havi"}};function n(t){return e[t]??null}let i={regex:"enigo",email:"retadreso",url:"URL",emoji:"emoĝio",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"ISO-datotempo",date:"ISO-dato",time:"ISO-tempo",duration:"ISO-daŭro",ipv4:"IPv4-adreso",ipv6:"IPv6-adreso",mac:"MAC-adreso",cidrv4:"IPv4-rango",cidrv6:"IPv6-rango",base64:"64-ume kodita karaktraro",base64url:"URL-64-ume kodita karaktraro",json_string:"JSON-karaktraro",e164:"E.164-nombro",credit_card:"kreditkarta numero",currency_code:"valuta kodo",iban:"IBAN",jwt:"JWT",template_literal:"enigo"},o={nan:"NaN",number:"nombro",array:"tabelo",null:"senvalora"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`Nevalida enigo: atendiĝis instanceof ${t.expected}, riceviĝis ${c}`:`Nevalida enigo: atendiĝis ${r}, riceviĝis ${c}`}case"invalid_value":return t.values.length===1?`Nevalida enigo: atendiĝis ${b(t.values[0])}`:`Nevalida opcio: atendiĝis unu el ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`Tro granda: atendiĝis ke ${t.origin??"valoro"} havu ${r}${t.maximum.toString()} ${a.unit??"elementojn"}`:`Tro granda: atendiĝis ke ${t.origin??"valoro"} havu ${r}${t.maximum.toString()}`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`Tro malgranda: atendiĝis ke ${t.origin} havu ${r}${t.minimum.toString()} ${a.unit}`:`Tro malgranda: atendiĝis ke ${t.origin} estu ${r}${t.minimum.toString()}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`Nevalida karaktraro: devas komenciĝi per "${r.prefix}"`:r.format==="ends_with"?`Nevalida karaktraro: devas finiĝi per "${r.suffix}"`:r.format==="includes"?`Nevalida karaktraro: devas inkluzivi "${r.includes}"`:r.format==="regex"?`Nevalida karaktraro: devas kongrui kun la modelo ${r.pattern}`:`Nevalida ${i[r.format]??t.format}`}case"not_multiple_of":return`Nevalida nombro: devas esti oblo de ${t.divisor}`;case"unrecognized_keys":return`Nekonata${t.keys.length>1?"j":""} ŝlosilo${t.keys.length>1?"j":""}: ${v(t.keys,", ")}`;case"invalid_key":return`Nevalida ŝlosilo en ${t.origin}`;case"invalid_union":return"Nevalida enigo";case"invalid_element":return`Nevalida valoro en ${t.origin}`;default:return"Nevalida enigo"}}};function Ld(){return{localeError:Hv()}}var Yv=()=>{let e={string:{unit:"caracteres",verb:"tener"},file:{unit:"bytes",verb:"tener"},array:{unit:"elementos",verb:"tener"},set:{unit:"elementos",verb:"tener"}};function n(t){return e[t]??null}let i={regex:"entrada",email:"dirección de correo electrónico",url:"URL",emoji:"emoji",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"fecha y hora ISO",date:"fecha ISO",time:"hora ISO",duration:"duración ISO",ipv4:"dirección IPv4",ipv6:"dirección IPv6",mac:"dirección MAC",cidrv4:"rango IPv4",cidrv6:"rango IPv6",base64:"cadena codificada en base64",base64url:"URL codificada en base64",json_string:"cadena JSON",e164:"número E.164",credit_card:"número de tarjeta de crédito",currency_code:"código de moneda",iban:"IBAN",jwt:"JWT",template_literal:"entrada"},o={nan:"NaN",string:"texto",number:"número",boolean:"booleano",array:"arreglo",object:"objeto",set:"conjunto",file:"archivo",date:"fecha",bigint:"número grande",symbol:"símbolo",undefined:"indefinido",null:"nulo",function:"función",map:"mapa",record:"registro",tuple:"tupla",enum:"enumeración",union:"unión",literal:"literal",promise:"promesa",void:"vacío",never:"nunca",unknown:"desconocido",any:"cualquiera"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`Entrada inválida: se esperaba instanceof ${t.expected}, recibido ${c}`:`Entrada inválida: se esperaba ${r}, recibido ${c}`}case"invalid_value":return t.values.length===1?`Entrada inválida: se esperaba ${b(t.values[0])}`:`Opción inválida: se esperaba una de ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin),c=o[t.origin]??t.origin;return a?`Demasiado grande: se esperaba que ${c??"valor"} tuviera ${r}${t.maximum.toString()} ${a.unit??"elementos"}`:`Demasiado grande: se esperaba que ${c??"valor"} fuera ${r}${t.maximum.toString()}`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin),c=o[t.origin]??t.origin;return a?`Demasiado pequeño: se esperaba que ${c} tuviera ${r}${t.minimum.toString()} ${a.unit}`:`Demasiado pequeño: se esperaba que ${c} fuera ${r}${t.minimum.toString()}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`Cadena inválida: debe comenzar con "${r.prefix}"`:r.format==="ends_with"?`Cadena inválida: debe terminar en "${r.suffix}"`:r.format==="includes"?`Cadena inválida: debe incluir "${r.includes}"`:r.format==="regex"?`Cadena inválida: debe coincidir con el patrón ${r.pattern}`:`Inválido ${i[r.format]??t.format}`}case"not_multiple_of":return`Número inválido: debe ser múltiplo de ${t.divisor}`;case"unrecognized_keys":return`Llave${t.keys.length>1?"s":""} desconocida${t.keys.length>1?"s":""}: ${v(t.keys,", ")}`;case"invalid_key":return`Llave inválida en ${o[t.origin]??t.origin}`;case"invalid_union":return"Entrada inválida";case"invalid_element":return`Valor inválido en ${o[t.origin]??t.origin}`;default:return"Entrada inválida"}}};function Cd(){return{localeError:Yv()}}var Qv=()=>{let e={string:{unit:"کاراکتر",verb:"داشته باشد"},file:{unit:"بایت",verb:"داشته باشد"},array:{unit:"آیتم",verb:"داشته باشد"},set:{unit:"آیتم",verb:"داشته باشد"},map:{unit:"آیتم",verb:"داشته باشد"}};function n(t){return e[t]??null}let i={regex:"ورودی",email:"آدرس ایمیل",url:"URL",emoji:"ایموجی",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"تاریخ و زمان ایزو",date:"تاریخ ایزو",time:"زمان ایزو",duration:"مدت زمان ایزو",ipv4:"IPv4 آدرس",ipv6:"IPv6 آدرس",mac:"MAC آدرس",cidrv4:"IPv4 دامنه",cidrv6:"IPv6 دامنه",base64:"base64-encoded رشته",base64url:"base64url-encoded رشته",json_string:"JSON رشته",e164:"E.164 عدد",credit_card:"شماره کارت اعتباری",currency_code:"کد ارز",iban:"IBAN",jwt:"JWT",template_literal:"ورودی"},o={nan:"NaN",number:"عدد",array:"آرایه"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`ورودی نامعتبر: می‌بایست instanceof ${t.expected} می‌بود، ${c} دریافت شد`:`ورودی نامعتبر: می‌بایست ${r} می‌بود، ${c} دریافت شد`}case"invalid_value":return t.values.length===1?`ورودی نامعتبر: می‌بایست ${b(t.values[0])} می‌بود`:`گزینه نامعتبر: می‌بایست یکی از ${v(t.values,"|")} می‌بود`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`خیلی بزرگ: ${t.origin??"مقدار"} باید ${r}${t.maximum.toString()} ${a.unit??"عنصر"} باشد`:`خیلی بزرگ: ${t.origin??"مقدار"} باید ${r}${t.maximum.toString()} باشد`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`خیلی کوچک: ${t.origin} باید ${r}${t.minimum.toString()} ${a.unit} باشد`:`خیلی کوچک: ${t.origin} باید ${r}${t.minimum.toString()} باشد`}case"invalid_format":{let r=t;return r.format==="starts_with"?`رشته نامعتبر: باید با "${r.prefix}" شروع شود`:r.format==="ends_with"?`رشته نامعتبر: باید با "${r.suffix}" تمام شود`:r.format==="includes"?`رشته نامعتبر: باید شامل "${r.includes}" باشد`:r.format==="regex"?`رشته نامعتبر: باید با الگوی ${r.pattern} مطابقت داشته باشد`:`${i[r.format]??t.format} نامعتبر`}case"not_multiple_of":return`عدد نامعتبر: باید مضرب ${t.divisor} باشد`;case"unrecognized_keys":return`کلید${t.keys.length>1?"های":""} ناشناس: ${v(t.keys,", ")}`;case"invalid_key":return`کلید ناشناس در ${t.origin}`;case"invalid_union":return"ورودی نامعتبر";case"invalid_element":return`مقدار نامعتبر در ${t.origin}`;default:return"ورودی نامعتبر"}}};function Zd(){return{localeError:Qv()}}var eh=()=>{let e={string:{unit:"merkkiä",subject:"merkkijonon"},file:{unit:"tavua",subject:"tiedoston"},array:{unit:"alkiota",subject:"listan"},set:{unit:"alkiota",subject:"joukon"},map:{unit:"alkiota",subject:"kuvauksen"},number:{unit:"",subject:"luvun"},bigint:{unit:"",subject:"suuren kokonaisluvun"},int:{unit:"",subject:"kokonaisluvun"},date:{unit:"",subject:"päivämäärän"}};function n(t){return e[t]??null}let i={regex:"säännöllinen lauseke",email:"sähköpostiosoite",url:"URL-osoite",emoji:"emoji",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"ISO-aikaleima",date:"ISO-päivämäärä",time:"ISO-aika",duration:"ISO-kesto",ipv4:"IPv4-osoite",ipv6:"IPv6-osoite",mac:"MAC-osoite",cidrv4:"IPv4-alue",cidrv6:"IPv6-alue",base64:"base64-koodattu merkkijono",base64url:"base64url-koodattu merkkijono",json_string:"JSON-merkkijono",e164:"E.164-luku",credit_card:"luottokortin numero",currency_code:"valuuttakoodi",iban:"IBAN",jwt:"JWT",template_literal:"templaattimerkkijono"},o={nan:"NaN"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`Virheellinen tyyppi: odotettiin instanceof ${t.expected}, oli ${c}`:`Virheellinen tyyppi: odotettiin ${r}, oli ${c}`}case"invalid_value":return t.values.length===1?`Virheellinen syöte: täytyy olla ${b(t.values[0])}`:`Virheellinen valinta: täytyy olla yksi seuraavista: ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`Liian suuri: ${a.subject} täytyy olla ${r}${t.maximum.toString()} ${a.unit}`.trim():`Liian suuri: arvon täytyy olla ${r}${t.maximum.toString()}`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`Liian pieni: ${a.subject} täytyy olla ${r}${t.minimum.toString()} ${a.unit}`.trim():`Liian pieni: arvon täytyy olla ${r}${t.minimum.toString()}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`Virheellinen syöte: täytyy alkaa "${r.prefix}"`:r.format==="ends_with"?`Virheellinen syöte: täytyy loppua "${r.suffix}"`:r.format==="includes"?`Virheellinen syöte: täytyy sisältää "${r.includes}"`:r.format==="regex"?`Virheellinen syöte: täytyy vastata säännöllistä lauseketta ${r.pattern}`:`Virheellinen ${i[r.format]??t.format}`}case"not_multiple_of":return`Virheellinen luku: täytyy olla luvun ${t.divisor} monikerta`;case"unrecognized_keys":return`${t.keys.length>1?"Tuntemattomat avaimet":"Tuntematon avain"}: ${v(t.keys,", ")}`;case"invalid_key":return"Virheellinen avain tietueessa";case"invalid_union":return"Virheellinen unioni";case"invalid_element":return"Virheellinen arvo joukossa";default:return"Virheellinen syöte"}}};function Rd(){return{localeError:eh()}}var th=()=>{let e={string:{unit:"caractères",verb:"avoir"},file:{unit:"octets",verb:"avoir"},array:{unit:"éléments",verb:"avoir"},set:{unit:"éléments",verb:"avoir"}};function n(t){return e[t]??null}let i={regex:"expression régulière",email:"adresse e-mail",url:"URL",emoji:"emoji",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"date et heure ISO",date:"date ISO",time:"heure ISO",duration:"durée ISO",ipv4:"adresse IPv4",ipv6:"adresse IPv6",mac:"adresse MAC",cidrv4:"plage IPv4",cidrv6:"plage IPv6",base64:"chaîne de caractères encodée en base64",base64url:"chaîne de caractères encodée en base64url",json_string:"chaîne de caractères JSON",e164:"numéro au format E.164",credit_card:"numéro de carte de crédit",currency_code:"code de devise",iban:"IBAN",jwt:"JWT",template_literal:"entrée"},o={string:"chaîne de caractères",number:"nombre",int:"entier",boolean:"booléen",bigint:"grand entier",symbol:"symbole",undefined:"indéfini",null:"null",never:"jamais",void:"vide",date:"date",array:"tableau",object:"objet",tuple:"tuple",record:"record",map:"map",set:"ensemble",file:"fichier",nonoptional:"non optionnel",nan:"NaN",function:"fonction"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`Entrée invalide : instance de ${t.expected} attendu, ${c} reçu`:`Entrée invalide : ${r} attendu, ${c} reçu`}case"invalid_value":return t.values.length===1?`Entrée invalide : ${b(t.values[0])} attendu`:`Option invalide : une valeur parmi ${v(t.values,"|")} attendue`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`Trop grand : ${o[t.origin]??"valeur"} doit ${a.verb} ${r}${t.maximum.toString()} ${a.unit??"élément(s)"}`:`Trop grand : ${o[t.origin]??"valeur"} doit être ${r}${t.maximum.toString()}`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`Trop petit : ${o[t.origin]??"valeur"} doit ${a.verb} ${r}${t.minimum.toString()} ${a.unit}`:`Trop petit : ${o[t.origin]??"valeur"} doit être ${r}${t.minimum.toString()}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`Chaîne de caractères invalide : doit commencer par "${r.prefix}"`:r.format==="ends_with"?`Chaîne de caractères invalide : doit se terminer par "${r.suffix}"`:r.format==="includes"?`Chaîne de caractères invalide : doit inclure "${r.includes}"`:r.format==="regex"?`Chaîne de caractères invalide : doit correspondre au motif ${r.pattern}`:`${i[r.format]??t.format} invalide`}case"not_multiple_of":return`Nombre invalide : doit être un multiple de ${t.divisor}`;case"unrecognized_keys":return`Clé${t.keys.length>1?"s":""} non reconnue${t.keys.length>1?"s":""} : ${v(t.keys,", ")}`;case"invalid_key":return`Clé invalide dans ${t.origin}`;case"invalid_union":return"Entrée invalide";case"invalid_element":return`Valeur invalide dans ${t.origin}`;default:return"Entrée invalide"}}};function Vd(){return{localeError:th()}}var nh=()=>{let e={string:{unit:"caractères",verb:"avoir"},file:{unit:"octets",verb:"avoir"},array:{unit:"éléments",verb:"avoir"},set:{unit:"éléments",verb:"avoir"},map:{unit:"éléments",verb:"avoir"}};function n(t){return e[t]??null}let i={regex:"entrée",email:"adresse courriel",url:"URL",emoji:"emoji",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"date-heure ISO",date:"date ISO",time:"heure ISO",duration:"durée ISO",ipv4:"adresse IPv4",ipv6:"adresse IPv6",mac:"adresse MAC",cidrv4:"plage IPv4",cidrv6:"plage IPv6",base64:"chaîne encodée en base64",base64url:"chaîne encodée en base64url",json_string:"chaîne JSON",e164:"numéro E.164",credit_card:"numéro de carte de crédit",currency_code:"code de devise",iban:"IBAN",jwt:"JWT",template_literal:"entrée"},o={nan:"NaN"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`Entrée invalide : attendu instanceof ${t.expected}, reçu ${c}`:`Entrée invalide : attendu ${r}, reçu ${c}`}case"invalid_value":return t.values.length===1?`Entrée invalide : attendu ${b(t.values[0])}`:`Option invalide : attendu l'une des valeurs suivantes ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"≤":"<",a=n(t.origin);return a?`Trop grand : attendu que ${t.origin??"la valeur"} ait ${r}${t.maximum.toString()} ${a.unit}`:`Trop grand : attendu que ${t.origin??"la valeur"} soit ${r}${t.maximum.toString()}`}case"too_small":{let r=t.inclusive?"≥":">",a=n(t.origin);return a?`Trop petit : attendu que ${t.origin} ait ${r}${t.minimum.toString()} ${a.unit}`:`Trop petit : attendu que ${t.origin} soit ${r}${t.minimum.toString()}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`Chaîne invalide : doit commencer par "${r.prefix}"`:r.format==="ends_with"?`Chaîne invalide : doit se terminer par "${r.suffix}"`:r.format==="includes"?`Chaîne invalide : doit inclure "${r.includes}"`:r.format==="regex"?`Chaîne invalide : doit correspondre au motif ${r.pattern}`:`${i[r.format]??t.format} invalide`}case"not_multiple_of":return`Nombre invalide : doit être un multiple de ${t.divisor}`;case"unrecognized_keys":return`Clé${t.keys.length>1?"s":""} non reconnue${t.keys.length>1?"s":""} : ${v(t.keys,", ")}`;case"invalid_key":return`Clé invalide dans ${t.origin}`;case"invalid_union":return"Entrée invalide";case"invalid_element":return`Valeur invalide dans ${t.origin}`;default:return"Entrée invalide"}}};function Bd(){return{localeError:nh()}}var rh=()=>{let e={string:{unit:"અક્ષર",verb:"હોવા જોઈએ"},file:{unit:"બાયટ",verb:"હોવા જોઈએ"},array:{unit:"આઇટમ",verb:"હોવા જોઈએ"},set:{unit:"આઇટમ",verb:"હોવા જોઈએ"},map:{unit:"એન્ટ્રી",verb:"હોવા જોઈએ"}};function n(t){return e[t]??null}let i={regex:"ઇનપુટ",email:"ઈમેઇલ એડ્રેસ",url:"URL",emoji:"ઇમોજી",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"ISO તારીખ અને સમય",date:"ISO તારીખ",time:"ISO સમય",duration:"ISO અવધિ",ipv4:"IPv4 એડ્રેસ",ipv6:"IPv6 એડ્રેસ",mac:"MAC એડ્રેસ",cidrv4:"IPv4 શ્રેણી",cidrv6:"IPv6 શ્રેણી",base64:"base64-એન્કોડેડ સ્ટ્રિંગ",base64url:"base64url-એન્કોડેડ સ્ટ્રિંગ",json_string:"JSON સ્ટ્રિંગ",e164:"E.164 નંબર",credit_card:"ક્રેડિટ કાર્ડ નંબર",currency_code:"ચલણ કોડ",iban:"IBAN",jwt:"JWT",template_literal:"ઇનપુટ"},o={nan:"NaN"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return`અમાન્ય ઇનપુટ: અપેક્ષિત ${r}, પ્રાપ્ત ${c}`}case"invalid_value":return t.values.length===1?`અમાન્ય ઇનપુટ: અપેક્ષિત ${b(t.values[0])}`:`અમાન્ય વિકલ્પ: ${v(t.values," | ")} માધ્યમથી એક અપેક્ષિત`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`ખૂબ મોટું: ${t.origin??"મૂલ્ય"} ${r}${t.maximum.toString()} ${a.unit??"એલિમેન્ટ"} હોવા જોઈએ`:`ખૂબ મોટું: ${t.origin??"મૂલ્ય"} ${r}${t.maximum.toString()} હોવું જોઈએ`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`ખૂબ નાનું: ${t.origin} ${r}${t.minimum.toString()} ${a.unit} હોવા જોઈએ`:`ખૂબ નાનું: ${t.origin} ${r}${t.minimum.toString()} હોવું જોઈએ`}case"invalid_format":{let r=t;return r.format==="starts_with"?`અમાન્ય સ્ટ્રિંગ: "${r.prefix}" થી શરૂ થવું જોઈએ`:r.format==="ends_with"?`અમાન્ય સ્ટ્રિંગ: "${r.suffix}" પર સમાપ્ત થવું જોઈએ`:r.format==="includes"?`અમાન્ય સ્ટ્રિંગ: "${r.includes}" શામેલ હોવું જોઈએ`:r.format==="regex"?`અમાન્ય સ્ટ્રિંગ: પેટર્ન ${r.pattern} સાથે મેળ ખાવું જોઈએ`:`અમાન્ય ${i[r.format]??t.format}`}case"not_multiple_of":return`અમાન્ય નંબર: ${t.divisor} નો ગુણાંક હોવો જોઈએ`;case"unrecognized_keys":return`ઓળખી શકાતા નહીં તે કી${t.keys.length>1?"ઓ":""}: ${v(t.keys,", ")}`;case"invalid_key":return`${t.origin} માં અમાન્ય કી`;case"invalid_union":return t.options&&Array.isArray(t.options)&&t.options.length>0?`અમાન્ય ડિસ્ક્રિમિનેટર મૂલ્ય. અપેક્ષિત ${t.options.map(a=>`'${a}'`).join(" | ")}`:"અમાન્ય ઇનપુટ";case"invalid_element":return`${t.origin} માં અમાન્ય મૂલ્ય`;default:return"અમાન્ય ઇનપુટ"}}};function Md(){return{localeError:rh()}}var ih=()=>{let e={string:{label:"מחרוזת",gender:"f"},number:{label:"מספר",gender:"m"},boolean:{label:"ערך בוליאני",gender:"m"},bigint:{label:"BigInt",gender:"m"},date:{label:"תאריך",gender:"m"},array:{label:"מערך",gender:"m"},object:{label:"אובייקט",gender:"m"},null:{label:"ערך ריק (null)",gender:"m"},undefined:{label:"ערך לא מוגדר (undefined)",gender:"m"},symbol:{label:"סימבול (Symbol)",gender:"m"},function:{label:"פונקציה",gender:"f"},map:{label:"מפה (Map)",gender:"f"},set:{label:"קבוצה (Set)",gender:"f"},file:{label:"קובץ",gender:"m"},promise:{label:"Promise",gender:"m"},NaN:{label:"NaN",gender:"m"},unknown:{label:"ערך לא ידוע",gender:"m"},value:{label:"ערך",gender:"m"}},n={string:{unit:"תווים",shortLabel:"קצר",longLabel:"ארוך"},file:{unit:"בייטים",shortLabel:"קטן",longLabel:"גדול"},array:{unit:"פריטים",shortLabel:"קטן",longLabel:"גדול"},set:{unit:"פריטים",shortLabel:"קטן",longLabel:"גדול"},number:{unit:"",shortLabel:"קטן",longLabel:"גדול"}},i=s=>s?e[s]:void 0,o=s=>{let l=i(s);return l?l.label:s??e.unknown.label},t=s=>`ה${o(s)}`,r=s=>(i(s)?.gender??"m")==="f"?"צריכה להיות":"צריך להיות",a=s=>s?n[s]??null:null,c={regex:{label:"קלט",gender:"m"},email:{label:"כתובת אימייל",gender:"f"},url:{label:"כתובת רשת",gender:"f"},emoji:{label:"אימוג'י",gender:"m"},uuid:{label:"UUID",gender:"m"},uuidv4:{label:"UUIDv4",gender:"m"},uuidv6:{label:"UUIDv6",gender:"m"},nanoid:{label:"nanoid",gender:"m"},guid:{label:"GUID",gender:"m"},cuid:{label:"cuid",gender:"m"},cuid2:{label:"cuid2",gender:"m"},ulid:{label:"ULID",gender:"m"},xid:{label:"XID",gender:"m"},ksuid:{label:"KSUID",gender:"m"},datetime:{label:"תאריך וזמן ISO",gender:"m"},date:{label:"תאריך ISO",gender:"m"},time:{label:"זמן ISO",gender:"m"},duration:{label:"משך זמן ISO",gender:"m"},ipv4:{label:"כתובת IPv4",gender:"f"},ipv6:{label:"כתובת IPv6",gender:"f"},mac:{label:"כתובת MAC",gender:"f"},cidrv4:{label:"טווח IPv4",gender:"m"},cidrv6:{label:"טווח IPv6",gender:"m"},base64:{label:"מחרוזת בבסיס 64",gender:"f"},base64url:{label:"מחרוזת בבסיס 64 לכתובות רשת",gender:"f"},json_string:{label:"מחרוזת JSON",gender:"f"},e164:{label:"מספר E.164",gender:"m"},credit_card:{label:"מספר כרטיס אשראי",gender:"m"},currency_code:{label:"קוד מטבע",gender:"m"},iban:{label:"IBAN",gender:"m"},jwt:{label:"JWT",gender:"m"},template_literal:{label:"קלט",gender:"m"},ends_with:{label:"קלט",gender:"m"},includes:{label:"קלט",gender:"m"},lowercase:{label:"קלט",gender:"m"},starts_with:{label:"קלט",gender:"m"},uppercase:{label:"קלט",gender:"m"}},u={nan:"NaN"};return s=>{switch(s.code){case"invalid_type":{let l=s.expected,p=u[l??""]??o(l),f=$(s.input),m=u[f]??e[f]?.label??f;return/^[A-Z]/.test(s.expected)?`קלט לא תקין: צריך להיות instanceof ${s.expected}, התקבל ${m}`:`קלט לא תקין: צריך להיות ${p}, התקבל ${m}`}case"invalid_value":{if(s.values.length===1)return`ערך לא תקין: הערך חייב להיות ${b(s.values[0])}`;let l=s.values.map(m=>b(m));if(s.values.length===2)return`ערך לא תקין: האפשרויות המתאימות הן ${l[0]} או ${l[1]}`;let p=l[l.length-1];return`ערך לא תקין: האפשרויות המתאימות הן ${l.slice(0,-1).join(", ")} או ${p}`}case"too_big":{let l=a(s.origin),p=t(s.origin??"value");if(s.origin==="string")return`${l?.longLabel??"ארוך"} מדי: ${p} צריכה להכיל ${s.maximum.toString()} ${l?.unit??""} ${s.inclusive?"או פחות":"לכל היותר"}`.trim();if(s.origin==="number"){let h=s.inclusive?`קטן או שווה ל-${s.maximum}`:`קטן מ-${s.maximum}`;return`גדול מדי: ${p} צריך להיות ${h}`}if(s.origin==="array"||s.origin==="set"){let h=s.origin==="set"?"צריכה":"צריך",_=s.inclusive?`${s.maximum} ${l?.unit??""} או פחות`:`פחות מ-${s.maximum} ${l?.unit??""}`;return`גדול מדי: ${p} ${h} להכיל ${_}`.trim()}let f=s.inclusive?"<=":"<",m=r(s.origin??"value");return l?.unit?`${l.longLabel} מדי: ${p} ${m} ${f}${s.maximum.toString()} ${l.unit}`:`${l?.longLabel??"גדול"} מדי: ${p} ${m} ${f}${s.maximum.toString()}`}case"too_small":{let l=a(s.origin),p=t(s.origin??"value");if(s.origin==="string")return`${l?.shortLabel??"קצר"} מדי: ${p} צריכה להכיל ${s.minimum.toString()} ${l?.unit??""} ${s.inclusive?"או יותר":"לפחות"}`.trim();if(s.origin==="number"){let h=s.inclusive?`גדול או שווה ל-${s.minimum}`:`גדול מ-${s.minimum}`;return`קטן מדי: ${p} צריך להיות ${h}`}if(s.origin==="array"||s.origin==="set"){let h=s.origin==="set"?"צריכה":"צריך";if(s.minimum===1&&s.inclusive){let x=(s.origin==="set","לפחות פריט אחד");return`קטן מדי: ${p} ${h} להכיל ${x}`}let _=s.inclusive?`${s.minimum} ${l?.unit??""} או יותר`:`יותר מ-${s.minimum} ${l?.unit??""}`;return`קטן מדי: ${p} ${h} להכיל ${_}`.trim()}let f=s.inclusive?">=":">",m=r(s.origin??"value");return l?.unit?`${l.shortLabel} מדי: ${p} ${m} ${f}${s.minimum.toString()} ${l.unit}`:`${l?.shortLabel??"קטן"} מדי: ${p} ${m} ${f}${s.minimum.toString()}`}case"invalid_format":{let l=s;if(l.format==="starts_with")return`המחרוזת חייבת להתחיל ב "${l.prefix}"`;if(l.format==="ends_with")return`המחרוזת חייבת להסתיים ב "${l.suffix}"`;if(l.format==="includes")return`המחרוזת חייבת לכלול "${l.includes}"`;if(l.format==="regex")return`המחרוזת חייבת להתאים לתבנית ${l.pattern}`;let p=c[l.format],f=p?.label??l.format,h=(p?.gender??"m")==="f"?"תקינה":"תקין";return`${f} לא ${h}`}case"not_multiple_of":return`מספר לא תקין: חייב להיות מכפלה של ${s.divisor}`;case"unrecognized_keys":return`מפתח${s.keys.length>1?"ות":""} לא מזוה${s.keys.length>1?"ים":"ה"}: ${v(s.keys,", ")}`;case"invalid_key":return"שדה לא תקין באובייקט";case"invalid_union":return"קלט לא תקין";case"invalid_element":return`ערך לא תקין ב${t(s.origin??"array")}`;default:return"קלט לא תקין"}}};function Fd(){return{localeError:ih()}}var oh=()=>{let e={string:{unit:"अक्षर",verb:"रखने के लिए"},file:{unit:"बाइट्स",verb:"रखने के लिए"},array:{unit:"तत्व",verb:"रखने के लिए"},set:{unit:"तत्व",verb:"रखने के लिए"},map:{unit:"प्रविष्टियाँ",verb:"रखने के लिए"}};function n(t){return e[t]??null}let i={regex:"इनपुट",email:"ईमेल पता",url:"URL",emoji:"इमोजी",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"ISO तिथि और समय",date:"ISO तिथि",time:"ISO समय",duration:"ISO अवधि",ipv4:"IPv4 पता",ipv6:"IPv6 पता",mac:"MAC पता",cidrv4:"IPv4 श्रेणी",cidrv6:"IPv6 श्रेणी",base64:"Base64-एन्कोडेड स्ट्रिंग",base64url:"Base64URL-एन्कोडेड स्ट्रिंग",json_string:"JSON स्ट्रिंग",e164:"E.164 संख्या",credit_card:"क्रेडिट कार्ड संख्या",currency_code:"मुद्रा कोड",iban:"IBAN",jwt:"JWT",template_literal:"इनपुट"},o={nan:"NaN"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return`अमान्य इनपुट: अपेक्षित ${r}, प्राप्त ${c}`}case"invalid_value":return t.values.length===1?`अमान्य इनपुट: अपेक्षित ${b(t.values[0])}`:`अमान्य विकल्प: अपेक्षित मानों में से एक ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`बहुत बड़ा: अपेक्षित था कि ${t.origin??"मान"} में ${r}${t.maximum} ${a.unit} हों`:`बहुत बड़ा: अपेक्षित था कि ${t.origin??"मान"} ${r}${t.maximum} हो`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`बहुत छोटा: अपेक्षित था कि ${t.origin} में ${r}${t.minimum} ${a.unit} हों`:`बहुत छोटा: अपेक्षित था कि ${t.origin} ${r}${t.minimum} हो`}case"invalid_format":{let r=t;return r.format==="starts_with"?`अमान्य स्ट्रिंग: "${r.prefix}" से शुरू होना चाहिए`:r.format==="ends_with"?`अमान्य स्ट्रिंग: "${r.suffix}" पर समाप्त होना चाहिए`:r.format==="includes"?`अमान्य स्ट्रिंग: इसमें "${r.includes}" शामिल होना चाहिए`:r.format==="regex"?`अमान्य स्ट्रिंग: पैटर्न ${r.pattern} से मेल खाना चाहिए`:`अमान्य ${i[r.format]??t.format}`}case"not_multiple_of":return`अमान्य संख्या: यह ${t.divisor} का गुणज होना चाहिए`;case"unrecognized_keys":return`अपरिचित कुंजी${t.keys.length>1?"याँ":""}: ${v(t.keys,", ")}`;case"invalid_key":return`अमान्य कुंजी: ${t.origin} में`;case"invalid_union":return t.options&&Array.isArray(t.options)&&t.options.length>0?`अमान्य डिस्क्रिमिनेटर मान: अपेक्षित ${t.options.map(a=>`'${a}'`).join(" | ")}`:"अमान्य इनपुट";case"invalid_element":return`अमान्य मान: ${t.origin} में`;default:return"अमान्य इनपुट"}}};function Jd(){return{localeError:oh()}}var ah=()=>{let e={string:{unit:"znakova",verb:"imati"},file:{unit:"bajtova",verb:"imati"},array:{unit:"stavki",verb:"imati"},set:{unit:"stavki",verb:"imati"}};function n(t){return e[t]??null}let i={regex:"unos",email:"email adresa",url:"URL",emoji:"emoji",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"ISO datum i vrijeme",date:"ISO datum",time:"ISO vrijeme",duration:"ISO trajanje",ipv4:"IPv4 adresa",ipv6:"IPv6 adresa",mac:"MAC adresa",cidrv4:"IPv4 raspon",cidrv6:"IPv6 raspon",base64:"base64 kodirani tekst",base64url:"base64url kodirani tekst",json_string:"JSON tekst",e164:"E.164 broj",credit_card:"broj kreditne kartice",currency_code:"kod valute",iban:"IBAN",jwt:"JWT",template_literal:"unos"},o={nan:"NaN",string:"tekst",number:"broj",boolean:"boolean",array:"niz",object:"objekt",set:"skup",file:"datoteka",date:"datum",bigint:"bigint",symbol:"simbol",undefined:"undefined",null:"null",function:"funkcija",map:"mapa"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`Neispravan unos: očekuje se instanceof ${t.expected}, a primljeno je ${c}`:`Neispravan unos: očekuje se ${r}, a primljeno je ${c}`}case"invalid_value":return t.values.length===1?`Neispravna vrijednost: očekivano ${b(t.values[0])}`:`Neispravna opcija: očekivano jedno od ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin),c=o[t.origin]??t.origin;return a?`Preveliko: očekivano da ${c??"vrijednost"} ima ${r}${t.maximum.toString()} ${a.unit??"elemenata"}`:`Preveliko: očekivano da ${c??"vrijednost"} bude ${r}${t.maximum.toString()}`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin),c=o[t.origin]??t.origin;return a?`Premalo: očekivano da ${c} ima ${r}${t.minimum.toString()} ${a.unit}`:`Premalo: očekivano da ${c} bude ${r}${t.minimum.toString()}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`Neispravan tekst: mora započinjati s "${r.prefix}"`:r.format==="ends_with"?`Neispravan tekst: mora završavati s "${r.suffix}"`:r.format==="includes"?`Neispravan tekst: mora sadržavati "${r.includes}"`:r.format==="regex"?`Neispravan tekst: mora odgovarati uzorku ${r.pattern}`:`Neispravna ${i[r.format]??t.format}`}case"not_multiple_of":return`Neispravan broj: mora biti višekratnik od ${t.divisor}`;case"unrecognized_keys":return`Neprepoznat${t.keys.length>1?"i ključevi":" ključ"}: ${v(t.keys,", ")}`;case"invalid_key":return`Neispravan ključ u ${o[t.origin]??t.origin}`;case"invalid_union":return"Neispravan unos";case"invalid_element":return`Neispravna vrijednost u ${o[t.origin]??t.origin}`;default:return"Neispravan unos"}}};function Kd(){return{localeError:ah()}}var ch=()=>{let e={string:{unit:"karakter",verb:"legyen"},file:{unit:"byte",verb:"legyen"},array:{unit:"elem",verb:"legyen"},set:{unit:"elem",verb:"legyen"},map:{unit:"elem",verb:"legyen"}};function n(t){return e[t]??null}let i={regex:"bemenet",email:"email cím",url:"URL",emoji:"emoji",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"ISO időbélyeg",date:"ISO dátum",time:"ISO idő",duration:"ISO időintervallum",ipv4:"IPv4 cím",ipv6:"IPv6 cím",mac:"MAC cím",cidrv4:"IPv4 tartomány",cidrv6:"IPv6 tartomány",base64:"base64-kódolt string",base64url:"base64url-kódolt string",json_string:"JSON string",e164:"E.164 szám",credit_card:"hitelkártyaszám",currency_code:"pénznemkód",iban:"IBAN",jwt:"JWT",template_literal:"bemenet"},o={nan:"NaN",number:"szám",array:"tömb"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`Érvénytelen bemenet: a várt érték instanceof ${t.expected}, a kapott érték ${c}`:`Érvénytelen bemenet: a várt érték ${r}, a kapott érték ${c}`}case"invalid_value":return t.values.length===1?`Érvénytelen bemenet: a várt érték ${b(t.values[0])}`:`Érvénytelen opció: valamelyik érték várt ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`Túl nagy: ${t.origin??"érték"} mérete túl nagy ${r}${t.maximum.toString()} ${a.unit??"elem"}`:`Túl nagy: a bemeneti érték ${t.origin??"érték"} túl nagy: ${r}${t.maximum.toString()}`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`Túl kicsi: a bemeneti érték ${t.origin} mérete túl kicsi ${r}${t.minimum.toString()} ${a.unit}`:`Túl kicsi: a bemeneti érték ${t.origin} túl kicsi ${r}${t.minimum.toString()}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`Érvénytelen string: "${r.prefix}" értékkel kell kezdődnie`:r.format==="ends_with"?`Érvénytelen string: "${r.suffix}" értékkel kell végződnie`:r.format==="includes"?`Érvénytelen string: "${r.includes}" értéket kell tartalmaznia`:r.format==="regex"?`Érvénytelen string: ${r.pattern} mintának kell megfelelnie`:`Érvénytelen ${i[r.format]??t.format}`}case"not_multiple_of":return`Érvénytelen szám: ${t.divisor} többszörösének kell lennie`;case"unrecognized_keys":return`Ismeretlen kulcs${t.keys.length>1?"s":""}: ${v(t.keys,", ")}`;case"invalid_key":return`Érvénytelen kulcs ${t.origin}`;case"invalid_union":return"Érvénytelen bemenet";case"invalid_element":return`Érvénytelen érték: ${t.origin}`;default:return"Érvénytelen bemenet"}}};function Wd(){return{localeError:ch()}}function Gd(e,n,i){return Math.abs(e)===1?n:i}function $t(e){if(!e)return"";let n=["ա","ե","ը","ի","ո","ու","օ"],i=e[e.length-1];return e+(n.includes(i)?"ն":"ը")}var uh=()=>{let e={string:{unit:{one:"նշան",many:"նշաններ"},verb:"ունենալ"},file:{unit:{one:"բայթ",many:"բայթեր"},verb:"ունենալ"},array:{unit:{one:"տարր",many:"տարրեր"},verb:"ունենալ"},set:{unit:{one:"տարր",many:"տարրեր"},verb:"ունենալ"},map:{unit:{one:"տարր",many:"տարրեր"},verb:"ունենալ"}};function n(t){return e[t]??null}let i={regex:"մուտք",email:"էլ. հասցե",url:"URL",emoji:"էմոջի",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"ISO ամսաթիվ և ժամ",date:"ISO ամսաթիվ",time:"ISO ժամ",duration:"ISO տևողություն",ipv4:"IPv4 հասցե",ipv6:"IPv6 հասցե",mac:"MAC հասցե",cidrv4:"IPv4 միջակայք",cidrv6:"IPv6 միջակայք",base64:"base64 ձևաչափով տող",base64url:"base64url ձևաչափով տող",json_string:"JSON տող",e164:"E.164 համար",credit_card:"կրեդիտ քարտի համար",currency_code:"արժույթի կոդ",iban:"IBAN",jwt:"JWT",template_literal:"մուտք"},o={nan:"NaN",number:"թիվ",array:"զանգված"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`Սխալ մուտքագրում․ սպասվում էր instanceof ${t.expected}, ստացվել է ${c}`:`Սխալ մուտքագրում․ սպասվում էր ${r}, ստացվել է ${c}`}case"invalid_value":return t.values.length===1?`Սխալ մուտքագրում․ սպասվում էր ${b(t.values[1])}`:`Սխալ տարբերակ․ սպասվում էր հետևյալներից մեկը՝ ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);if(a){let c=Number(t.maximum),u=Gd(c,a.unit.one,a.unit.many);return`Չափազանց մեծ արժեք․ սպասվում է, որ ${$t(t.origin??"արժեք")} կունենա ${r}${t.maximum.toString()} ${u}`}return`Չափազանց մեծ արժեք․ սպասվում է, որ ${$t(t.origin??"արժեք")} լինի ${r}${t.maximum.toString()}`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);if(a){let c=Number(t.minimum),u=Gd(c,a.unit.one,a.unit.many);return`Չափազանց փոքր արժեք․ սպասվում է, որ ${$t(t.origin)} կունենա ${r}${t.minimum.toString()} ${u}`}return`Չափազանց փոքր արժեք․ սպասվում է, որ ${$t(t.origin)} լինի ${r}${t.minimum.toString()}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`Սխալ տող․ պետք է սկսվի "${r.prefix}"-ով`:r.format==="ends_with"?`Սխալ տող․ պետք է ավարտվի "${r.suffix}"-ով`:r.format==="includes"?`Սխալ տող․ պետք է պարունակի "${r.includes}"`:r.format==="regex"?`Սխալ տող․ պետք է համապատասխանի ${r.pattern} ձևաչափին`:`Սխալ ${i[r.format]??t.format}`}case"not_multiple_of":return`Սխալ թիվ․ պետք է բազմապատիկ լինի ${t.divisor}-ի`;case"unrecognized_keys":return`Չճանաչված բանալի${t.keys.length>1?"ներ":""}. ${v(t.keys,", ")}`;case"invalid_key":return`Սխալ բանալի ${$t(t.origin)}-ում`;case"invalid_union":return"Սխալ մուտքագրում";case"invalid_element":return`Սխալ արժեք ${$t(t.origin)}-ում`;default:return"Սխալ մուտքագրում"}}};function Xd(){return{localeError:uh()}}var sh=()=>{let e={string:{unit:"karakter",verb:"memiliki"},file:{unit:"byte",verb:"memiliki"},array:{unit:"item",verb:"memiliki"},set:{unit:"item",verb:"memiliki"},map:{unit:"item",verb:"memiliki"}};function n(t){return e[t]??null}let i={regex:"input",email:"alamat email",url:"URL",emoji:"emoji",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"tanggal dan waktu format ISO",date:"tanggal format ISO",time:"jam format ISO",duration:"durasi format ISO",ipv4:"alamat IPv4",ipv6:"alamat IPv6",mac:"alamat MAC",cidrv4:"rentang alamat IPv4",cidrv6:"rentang alamat IPv6",base64:"string dengan enkode base64",base64url:"string dengan enkode base64url",json_string:"string JSON",e164:"angka E.164",credit_card:"nomor kartu kredit",currency_code:"kode mata uang",iban:"IBAN",jwt:"JWT",template_literal:"input"},o={nan:"NaN"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`Input tidak valid: diharapkan instanceof ${t.expected}, diterima ${c}`:`Input tidak valid: diharapkan ${r}, diterima ${c}`}case"invalid_value":return t.values.length===1?`Input tidak valid: diharapkan ${b(t.values[0])}`:`Pilihan tidak valid: diharapkan salah satu dari ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`Terlalu besar: diharapkan ${t.origin??"value"} memiliki ${r}${t.maximum.toString()} ${a.unit??"elemen"}`:`Terlalu besar: diharapkan ${t.origin??"value"} menjadi ${r}${t.maximum.toString()}`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`Terlalu kecil: diharapkan ${t.origin} memiliki ${r}${t.minimum.toString()} ${a.unit}`:`Terlalu kecil: diharapkan ${t.origin} menjadi ${r}${t.minimum.toString()}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`String tidak valid: harus dimulai dengan "${r.prefix}"`:r.format==="ends_with"?`String tidak valid: harus berakhir dengan "${r.suffix}"`:r.format==="includes"?`String tidak valid: harus menyertakan "${r.includes}"`:r.format==="regex"?`String tidak valid: harus sesuai pola ${r.pattern}`:`${i[r.format]??t.format} tidak valid`}case"not_multiple_of":return`Angka tidak valid: harus kelipatan dari ${t.divisor}`;case"unrecognized_keys":return`Kunci tidak dikenali ${t.keys.length>1?"s":""}: ${v(t.keys,", ")}`;case"invalid_key":return`Kunci tidak valid di ${t.origin}`;case"invalid_union":return"Input tidak valid";case"invalid_element":return`Nilai tidak valid di ${t.origin}`;default:return"Input tidak valid"}}};function qd(){return{localeError:sh()}}var lh=()=>{let e={string:{unit:"stafi",verb:"að hafa"},file:{unit:"bæti",verb:"að hafa"},array:{unit:"hluti",verb:"að hafa"},set:{unit:"hluti",verb:"að hafa"},map:{unit:"hluti",verb:"að hafa"}};function n(t){return e[t]??null}let i={regex:"gildi",email:"netfang",url:"vefslóð",emoji:"emoji",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"ISO dagsetning og tími",date:"ISO dagsetning",time:"ISO tími",duration:"ISO tímalengd",ipv4:"IPv4 address",ipv6:"IPv6 address",mac:"MAC address",cidrv4:"IPv4 range",cidrv6:"IPv6 range",base64:"base64-encoded strengur",base64url:"base64url-encoded strengur",json_string:"JSON strengur",e164:"E.164 tölugildi",credit_card:"kreditkortanúmer",currency_code:"gjaldmiðilskóði",iban:"IBAN",jwt:"JWT",template_literal:"gildi"},o={nan:"NaN",number:"númer",array:"fylki"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`Rangt gildi: Þú slóst inn ${c} þar sem á að vera instanceof ${t.expected}`:`Rangt gildi: Þú slóst inn ${c} þar sem á að vera ${r}`}case"invalid_value":return t.values.length===1?`Rangt gildi: gert ráð fyrir ${b(t.values[0])}`:`Ógilt val: má vera eitt af eftirfarandi ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`Of stórt: gert er ráð fyrir að ${t.origin??"gildi"} hafi ${r}${t.maximum.toString()} ${a.unit??"hluti"}`:`Of stórt: gert er ráð fyrir að ${t.origin??"gildi"} sé ${r}${t.maximum.toString()}`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`Of lítið: gert er ráð fyrir að ${t.origin} hafi ${r}${t.minimum.toString()} ${a.unit}`:`Of lítið: gert er ráð fyrir að ${t.origin} sé ${r}${t.minimum.toString()}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`Ógildur strengur: verður að byrja á "${r.prefix}"`:r.format==="ends_with"?`Ógildur strengur: verður að enda á "${r.suffix}"`:r.format==="includes"?`Ógildur strengur: verður að innihalda "${r.includes}"`:r.format==="regex"?`Ógildur strengur: verður að fylgja mynstri ${r.pattern}`:`Rangt ${i[r.format]??t.format}`}case"not_multiple_of":return`Röng tala: verður að vera margfeldi af ${t.divisor}`;case"unrecognized_keys":return`Óþekkt ${t.keys.length>1?"ir lyklar":"ur lykill"}: ${v(t.keys,", ")}`;case"invalid_key":return`Rangur lykill í ${t.origin}`;case"invalid_union":return"Rangt gildi";case"invalid_element":return`Rangt gildi í ${t.origin}`;default:return"Rangt gildi"}}};function Hd(){return{localeError:lh()}}var dh=()=>{let e={string:{unit:"caratteri",verb:"avere"},file:{unit:"byte",verb:"avere"},array:{unit:"elementi",verb:"avere"},set:{unit:"elementi",verb:"avere"},map:{unit:"elementi",verb:"avere"}};function n(t){return e[t]??null}let i={regex:"input",email:"indirizzo email",url:"URL",emoji:"emoji",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"data e ora ISO",date:"data ISO",time:"ora ISO",duration:"durata ISO",ipv4:"indirizzo IPv4",ipv6:"indirizzo IPv6",mac:"indirizzo MAC",cidrv4:"intervallo IPv4",cidrv6:"intervallo IPv6",base64:"stringa codificata in base64",base64url:"URL codificata in base64",json_string:"stringa JSON",e164:"numero E.164",credit_card:"numero di carta di credito",currency_code:"codice valuta",iban:"IBAN",jwt:"JWT",template_literal:"input"},o={nan:"NaN",number:"numero",array:"vettore"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`Input non valido: atteso instanceof ${t.expected}, ricevuto ${c}`:`Input non valido: atteso ${r}, ricevuto ${c}`}case"invalid_value":return t.values.length===1?`Input non valido: atteso ${b(t.values[0])}`:`Opzione non valida: atteso uno tra ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`Troppo grande: ${t.origin??"valore"} deve avere ${r}${t.maximum.toString()} ${a.unit??"elementi"}`:`Troppo grande: ${t.origin??"valore"} deve essere ${r}${t.maximum.toString()}`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`Troppo piccolo: ${t.origin} deve avere ${r}${t.minimum.toString()} ${a.unit}`:`Troppo piccolo: ${t.origin} deve essere ${r}${t.minimum.toString()}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`Stringa non valida: deve iniziare con "${r.prefix}"`:r.format==="ends_with"?`Stringa non valida: deve terminare con "${r.suffix}"`:r.format==="includes"?`Stringa non valida: deve includere "${r.includes}"`:r.format==="regex"?`Stringa non valida: deve corrispondere al pattern ${r.pattern}`:`Input non valido: ${i[r.format]??t.format}`}case"not_multiple_of":return`Numero non valido: deve essere un multiplo di ${t.divisor}`;case"unrecognized_keys":return`Chiav${t.keys.length>1?"i":"e"} non riconosciut${t.keys.length>1?"e":"a"}: ${v(t.keys,", ")}`;case"invalid_key":return`Chiave non valida in ${t.origin}`;case"invalid_union":return"Input non valido";case"invalid_element":return`Valore non valido in ${t.origin}`;default:return"Input non valido"}}};function Yd(){return{localeError:dh()}}var ph=()=>{let e={string:{unit:"文字",verb:"である"},file:{unit:"バイト",verb:"である"},array:{unit:"要素",verb:"である"},set:{unit:"要素",verb:"である"},map:{unit:"要素",verb:"である"}};function n(t){return e[t]??null}let i={regex:"入力値",email:"メールアドレス",url:"URL",emoji:"絵文字",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"ISO日時",date:"ISO日付",time:"ISO時刻",duration:"ISO期間",ipv4:"IPv4アドレス",ipv6:"IPv6アドレス",mac:"MACアドレス",cidrv4:"IPv4範囲",cidrv6:"IPv6範囲",base64:"base64エンコード文字列",base64url:"base64urlエンコード文字列",json_string:"JSON文字列",e164:"E.164番号",credit_card:"クレジットカード番号",currency_code:"通貨コード",iban:"IBAN",jwt:"JWT",template_literal:"入力値"},o={nan:"NaN",number:"数値",array:"配列"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`無効な入力: instanceof ${t.expected}が期待されましたが、${c}が入力されました`:`無効な入力: ${r}が期待されましたが、${c}が入力されました`}case"invalid_value":return t.values.length===1?`無効な入力: ${b(t.values[0])}が期待されました`:`無効な選択: ${v(t.values,"、")}のいずれかである必要があります`;case"too_big":{let r=t.inclusive?"以下である":"より小さい",a=n(t.origin);return a?`大きすぎる値: ${t.origin??"値"}は${t.maximum.toString()}${a.unit??"要素"}${r}必要があります`:`大きすぎる値: ${t.origin??"値"}は${t.maximum.toString()}${r}必要があります`}case"too_small":{let r=t.inclusive?"以上である":"より大きい",a=n(t.origin);return a?`小さすぎる値: ${t.origin}は${t.minimum.toString()}${a.unit}${r}必要があります`:`小さすぎる値: ${t.origin}は${t.minimum.toString()}${r}必要があります`}case"invalid_format":{let r=t;return r.format==="starts_with"?`無効な文字列: "${r.prefix}"で始まる必要があります`:r.format==="ends_with"?`無効な文字列: "${r.suffix}"で終わる必要があります`:r.format==="includes"?`無効な文字列: "${r.includes}"を含む必要があります`:r.format==="regex"?`無効な文字列: パターン${r.pattern}に一致する必要があります`:`無効な${i[r.format]??t.format}`}case"not_multiple_of":return`無効な数値: ${t.divisor}の倍数である必要があります`;case"unrecognized_keys":return`認識されていないキー${t.keys.length>1?"群":""}: ${v(t.keys,"、")}`;case"invalid_key":return`${t.origin}内の無効なキー`;case"invalid_union":return"無効な入力";case"invalid_element":return`${t.origin}内の無効な値`;default:return"無効な入力"}}};function Qd(){return{localeError:ph()}}var fh=()=>{let e={string:{unit:"სიმბოლო",verb:"უნდა შეიცავდეს"},file:{unit:"ბაიტი",verb:"უნდა შეიცავდეს"},array:{unit:"ელემენტი",verb:"უნდა შეიცავდეს"},set:{unit:"ელემენტი",verb:"უნდა შეიცავდეს"},map:{unit:"ელემენტი",verb:"უნდა შეიცავდეს"}};function n(t){return e[t]??null}let i={regex:"შეყვანა",email:"ელ-ფოსტის მისამართი",url:"URL",emoji:"ემოჯი",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"თარიღი-დრო",date:"თარიღი",time:"დრო",duration:"ხანგრძლივობა",ipv4:"IPv4 მისამართი",ipv6:"IPv6 მისამართი",mac:"MAC მისამართი",cidrv4:"IPv4 დიაპაზონი",cidrv6:"IPv6 დიაპაზონი",base64:"base64-კოდირებული ველი",base64url:"base64url-კოდირებული ველი",json_string:"JSON ველი",e164:"E.164 ნომერი",credit_card:"საკრედიტო ბარათის ნომერი",currency_code:"ვალუტის კოდი",iban:"IBAN",jwt:"JWT",template_literal:"შეყვანა"},o={nan:"NaN",number:"რიცხვი",string:"ველი",boolean:"ბულეანი",function:"ფუნქცია",array:"მასივი"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`არასწორი შეყვანა: მოსალოდნელი instanceof ${t.expected}, მიღებული ${c}`:`არასწორი შეყვანა: მოსალოდნელი ${r}, მიღებული ${c}`}case"invalid_value":return t.values.length===1?`არასწორი შეყვანა: მოსალოდნელი ${b(t.values[0])}`:`არასწორი ვარიანტი: მოსალოდნელია ერთ-ერთი ${v(t.values,"|")}-დან`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`ზედმეტად დიდი: მოსალოდნელი ${t.origin??"მნიშვნელობა"} ${a.verb} ${r}${t.maximum.toString()} ${a.unit}`:`ზედმეტად დიდი: მოსალოდნელი ${t.origin??"მნიშვნელობა"} იყოს ${r}${t.maximum.toString()}`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`ზედმეტად პატარა: მოსალოდნელი ${t.origin} ${a.verb} ${r}${t.minimum.toString()} ${a.unit}`:`ზედმეტად პატარა: მოსალოდნელი ${t.origin} იყოს ${r}${t.minimum.toString()}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`არასწორი ველი: უნდა იწყებოდეს "${r.prefix}"-ით`:r.format==="ends_with"?`არასწორი ველი: უნდა მთავრდებოდეს "${r.suffix}"-ით`:r.format==="includes"?`არასწორი ველი: უნდა შეიცავდეს "${r.includes}"-ს`:r.format==="regex"?`არასწორი ველი: უნდა შეესაბამებოდეს შაბლონს ${r.pattern}`:`არასწორი ${i[r.format]??t.format}`}case"not_multiple_of":return`არასწორი რიცხვი: უნდა იყოს ${t.divisor}-ის ჯერადი`;case"unrecognized_keys":return`უცნობი გასაღებ${t.keys.length>1?"ები":"ი"}: ${v(t.keys,", ")}`;case"invalid_key":return`არასწორი გასაღები ${t.origin}-ში`;case"invalid_union":return"არასწორი შეყვანა";case"invalid_element":return`არასწორი მნიშვნელობა ${t.origin}-ში`;default:return"არასწორი შეყვანა"}}};function ep(){return{localeError:fh()}}var mh=()=>{let e={string:{unit:"តួអក្សរ",verb:"គួរមាន"},file:{unit:"បៃ",verb:"គួរមាន"},array:{unit:"ធាតុ",verb:"គួរមាន"},set:{unit:"ធាតុ",verb:"គួរមាន"},map:{unit:"ធាតុ",verb:"គួរមាន"}};function n(t){return e[t]??null}let i={regex:"ទិន្នន័យបញ្ចូល",email:"អាសយដ្ឋានអ៊ីមែល",url:"URL",emoji:"សញ្ញាអារម្មណ៍",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"កាលបរិច្ឆេទ និងម៉ោង ISO",date:"កាលបរិច្ឆេទ ISO",time:"ម៉ោង ISO",duration:"រយៈពេល ISO",ipv4:"អាសយដ្ឋាន IPv4",ipv6:"អាសយដ្ឋាន IPv6",mac:"អាសយដ្ឋាន MAC",cidrv4:"ដែនអាសយដ្ឋាន IPv4",cidrv6:"ដែនអាសយដ្ឋាន IPv6",base64:"ខ្សែអក្សរអ៊ិកូដ base64",base64url:"ខ្សែអក្សរអ៊ិកូដ base64url",json_string:"ខ្សែអក្សរ JSON",e164:"លេខ E.164",credit_card:"លេខប័ណ្ណឥណទាន",currency_code:"កូដរូបិយប័ណ្ណ",iban:"IBAN",jwt:"JWT",template_literal:"ទិន្នន័យបញ្ចូល"},o={nan:"NaN",number:"លេខ",array:"អារេ (Array)",null:"គ្មានតម្លៃ (null)"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`ទិន្នន័យបញ្ចូលមិនត្រឹមត្រូវ៖ ត្រូវការ instanceof ${t.expected} ប៉ុន្តែទទួលបាន ${c}`:`ទិន្នន័យបញ្ចូលមិនត្រឹមត្រូវ៖ ត្រូវការ ${r} ប៉ុន្តែទទួលបាន ${c}`}case"invalid_value":return t.values.length===1?`ទិន្នន័យបញ្ចូលមិនត្រឹមត្រូវ៖ ត្រូវការ ${b(t.values[0])}`:`ជម្រើសមិនត្រឹមត្រូវ៖ ត្រូវជាមួយក្នុងចំណោម ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`ធំពេក៖ ត្រូវការ ${t.origin??"តម្លៃ"} ${r} ${t.maximum.toString()} ${a.unit??"ធាតុ"}`:`ធំពេក៖ ត្រូវការ ${t.origin??"តម្លៃ"} ${r} ${t.maximum.toString()}`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`តូចពេក៖ ត្រូវការ ${t.origin} ${r} ${t.minimum.toString()} ${a.unit}`:`តូចពេក៖ ត្រូវការ ${t.origin} ${r} ${t.minimum.toString()}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`ខ្សែអក្សរមិនត្រឹមត្រូវ៖ ត្រូវចាប់ផ្តើមដោយ "${r.prefix}"`:r.format==="ends_with"?`ខ្សែអក្សរមិនត្រឹមត្រូវ៖ ត្រូវបញ្ចប់ដោយ "${r.suffix}"`:r.format==="includes"?`ខ្សែអក្សរមិនត្រឹមត្រូវ៖ ត្រូវមាន "${r.includes}"`:r.format==="regex"?`ខ្សែអក្សរមិនត្រឹមត្រូវ៖ ត្រូវតែផ្គូផ្គងនឹងទម្រង់ដែលបានកំណត់ ${r.pattern}`:`មិនត្រឹមត្រូវ៖ ${i[r.format]??t.format}`}case"not_multiple_of":return`លេខមិនត្រឹមត្រូវ៖ ត្រូវតែជាពហុគុណនៃ ${t.divisor}`;case"unrecognized_keys":return`រកឃើញសោមិនស្គាល់៖ ${v(t.keys,", ")}`;case"invalid_key":return`សោមិនត្រឹមត្រូវនៅក្នុង ${t.origin}`;case"invalid_union":return"ទិន្នន័យមិនត្រឹមត្រូវ";case"invalid_element":return`ទិន្នន័យមិនត្រឹមត្រូវនៅក្នុង ${t.origin}`;default:return"ទិន្នន័យមិនត្រឹមត្រូវ"}}};function Br(){return{localeError:mh()}}function tp(){return Br()}var gh=()=>{let e={string:{unit:"ಅಕ್ಷರಗಳು",verb:"ಹೊಂದಲು"},file:{unit:"ಬೈಟ್‌ಗಳು",verb:"ಹೊಂದಲು"},array:{unit:"ವಸ್ತುಗಳು",verb:"ಹೊಂದಲು"},set:{unit:"ವಸ್ತುಗಳು",verb:"ಹೊಂದಲು"},map:{unit:"entries",verb:"ಹೊಂದಲು"}};function n(t){return e[t]??null}let i={regex:"ಇನ್ಪುಟ್",email:"email ವಿಳಾಸ",url:"URL",emoji:"emoji",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"ISO ದಿನಾಂಕದ ಸಮಯ",date:"ISO ದಿನಾಂಕ",time:"ISO ಸಮಯ",duration:"ISO ಅವಧಿ",ipv4:"IPv4 ವಿಳಾಸ",ipv6:"IPv6 ವಿಳಾಸ",mac:"MAC ವಿಳಾಸ",cidrv4:"IPv4 ವ್ಯಾಪ್ತಿಯ",cidrv6:"IPv6 ವ್ಯಾಪ್ತಿಯ",base64:"base64-encodedಸ್ಟ್ರಿಂಗ್",base64url:"base64url-encodedಸ್ಟ್ರಿಂಗ್",json_string:"JSONಸ್ಟ್ರಿಂಗ್",e164:"E.164 ಸಂಖ್ಯೆ",credit_card:"ಕ್ರೆಡಿಟ್ ಕಾರ್ಡ್ ಸಂಖ್ಯೆ",currency_code:"ಕರೆನ್ಸಿ ಕೋಡ್",iban:"IBAN",jwt:"JWT",template_literal:"ಇನ್ಪುಟ್"},o={nan:"NaN"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return`ಅಮಾನ್ಯ ಇನ್‌ಪುಟ್: ನಿರೀಕ್ಷಿಸಲಾಗಿದೆ ${r}, ಸ್ವೀಕರಿಸಿದನು ${c}`}case"invalid_value":return t.values.length===1?`ಅಮಾನ್ಯ ಇನ್‌ಪುಟ್: ನಿರೀಕ್ಷಿಸಲಾಗಿದೆ ${b(t.values[0])}`:`ಅಮಾನ್ಯ ಆಯ್ಕೆ: ಇವುಗಳಲ್ಲಿ ಒಂದನ್ನು ನಿರೀಕ್ಷಿಸಲಾಗಿದೆ ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`ತುಂಬಾ ದೊಡ್ಡದು: ನಿರೀಕ್ಷಿಸಲಾಗಿದೆ ${t.origin??"value"} ಹೊಂದಲು ${r}${t.maximum.toString()} ${a.unit??"ಅಂಶಗಳು"}`:`ತುಂಬಾ ದೊಡ್ಡದು: ನಿರೀಕ್ಷಿಸಲಾಗಿದೆ ${t.origin??"value"} ಎಂದು ${r}${t.maximum.toString()}`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`ತುಂಬಾ ಚಿಕ್ಕದು: ನಿರೀಕ್ಷಿಸಲಾಗಿದೆ ${t.origin} ಹೊಂದಲು ${r}${t.minimum.toString()} ${a.unit}`:`ತುಂಬಾ ಚಿಕ್ಕದು: ನಿರೀಕ್ಷಿಸಲಾಗಿದೆ ${t.origin} ಎಂದು ${r}${t.minimum.toString()}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`ಅಮಾನ್ಯವಾದ ಸ್ಟ್ರಿಂಗ್: ಇದರೊಂದಿಗೆ ಪ್ರಾರಂಭಿಸಬೇಕು "${r.prefix}"`:r.format==="ends_with"?`ಅಮಾನ್ಯವಾದ ಸ್ಟ್ರಿಂಗ್: ಇದರೊಂದಿಗೆ ಕೊನೆಗೊಳ್ಳಬೇಕು "${r.suffix}"`:r.format==="includes"?`ಅಮಾನ್ಯ ಸ್ಟ್ರಿಂಗ್: ಒಳಗೊಂಡಿರಬೇಕು "${r.includes}"`:r.format==="regex"?`ಅಮಾನ್ಯವಾದ ಸ್ಟ್ರಿಂಗ್: ಮಾದರಿಗೆ ಹೊಂದಿಕೆಯಾಗಬೇಕು ${r.pattern}`:`ಅಮಾನ್ಯ ${i[r.format]??t.format}`}case"not_multiple_of":return`ಅಮಾನ್ಯ ಸಂಖ್ಯೆ: ಬಹುಸಂಖ್ಯೆಯಾಗಿರಬೇಕು ${t.divisor}`;case"unrecognized_keys":return`ಗುರುತಿಸಲಾಗದ ಕೀ ${t.keys.length>1?"s":""}: ${v(t.keys,", ")}`;case"invalid_key":return`ಅಮಾನ್ಯವಾದ ಕೀ ಇನ್ ${t.origin}`;case"invalid_union":return t.options&&Array.isArray(t.options)&&t.options.length>0?`ಅಮಾನ್ಯ ತಾರತಮ್ಯ ಮೌಲ್ಯ. ನಿರೀಕ್ಷಿಸಲಾಗಿದೆ ${t.options.map(a=>`'${a}'`).join(" | ")}`:"ಅಮಾನ್ಯ ಇನ್‌ಪುಟ್";case"invalid_element":return`ರಲ್ಲಿ ಅಮಾನ್ಯ ಮೌಲ್ಯ ${t.origin}`;default:return"ಅಮಾನ್ಯ ಇನ್‌ಪುಟ್"}}};function np(){return{localeError:gh()}}var vh=()=>{let e={string:{unit:"문자",verb:"to have"},file:{unit:"바이트",verb:"to have"},array:{unit:"개",verb:"to have"},set:{unit:"개",verb:"to have"},map:{unit:"개",verb:"to have"}};function n(t){return e[t]??null}let i={regex:"입력",email:"이메일 주소",url:"URL",emoji:"이모지",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"ISO 날짜시간",date:"ISO 날짜",time:"ISO 시간",duration:"ISO 기간",ipv4:"IPv4 주소",ipv6:"IPv6 주소",mac:"MAC 주소",cidrv4:"IPv4 범위",cidrv6:"IPv6 범위",base64:"base64 인코딩 문자열",base64url:"base64url 인코딩 문자열",json_string:"JSON 문자열",e164:"E.164 번호",credit_card:"신용카드 번호",currency_code:"통화 코드",iban:"IBAN",jwt:"JWT",template_literal:"입력"},o={nan:"NaN"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`잘못된 입력: 예상 타입은 instanceof ${t.expected}, 받은 타입은 ${c}입니다`:`잘못된 입력: 예상 타입은 ${r}, 받은 타입은 ${c}입니다`}case"invalid_value":return t.values.length===1?`잘못된 입력: 값은 ${b(t.values[0])} 이어야 합니다`:`잘못된 옵션: ${v(t.values,"또는 ")} 중 하나여야 합니다`;case"too_big":{let r=t.inclusive?"이하":"미만",a=r==="미만"?"이어야 합니다":"여야 합니다",c=n(t.origin),u=c?.unit??"요소";return c?`${t.origin??"값"}이 너무 큽니다: ${t.maximum.toString()}${u} ${r}${a}`:`${t.origin??"값"}이 너무 큽니다: ${t.maximum.toString()} ${r}${a}`}case"too_small":{let r=t.inclusive?"이상":"초과",a=r==="이상"?"이어야 합니다":"여야 합니다",c=n(t.origin),u=c?.unit??"요소";return c?`${t.origin??"값"}이 너무 작습니다: ${t.minimum.toString()}${u} ${r}${a}`:`${t.origin??"값"}이 너무 작습니다: ${t.minimum.toString()} ${r}${a}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`잘못된 문자열: "${r.prefix}"(으)로 시작해야 합니다`:r.format==="ends_with"?`잘못된 문자열: "${r.suffix}"(으)로 끝나야 합니다`:r.format==="includes"?`잘못된 문자열: "${r.includes}"을(를) 포함해야 합니다`:r.format==="regex"?`잘못된 문자열: 정규식 ${r.pattern} 패턴과 일치해야 합니다`:`잘못된 ${i[r.format]??t.format}`}case"not_multiple_of":return`잘못된 숫자: ${t.divisor}의 배수여야 합니다`;case"unrecognized_keys":return`인식할 수 없는 키: ${v(t.keys,", ")}`;case"invalid_key":return`잘못된 키: ${t.origin}`;case"invalid_union":return"잘못된 입력";case"invalid_element":return`잘못된 값: ${t.origin}`;default:return"잘못된 입력"}}};function rp(){return{localeError:vh()}}var xn=e=>e.charAt(0).toUpperCase()+e.slice(1);function ip(e){let n=Math.abs(e),i=n%10,o=n%100;return o>=11&&o<=19||i===0?"many":i===1?"one":"few"}var hh=()=>{let e={string:{unit:{one:"simbolis",few:"simboliai",many:"simbolių"},verb:{smaller:{inclusive:"turi būti ne ilgesnė kaip",notInclusive:"turi būti trumpesnė kaip"},bigger:{inclusive:"turi būti ne trumpesnė kaip",notInclusive:"turi būti ilgesnė kaip"}}},file:{unit:{one:"baitas",few:"baitai",many:"baitų"},verb:{smaller:{inclusive:"turi būti ne didesnis kaip",notInclusive:"turi būti mažesnis kaip"},bigger:{inclusive:"turi būti ne mažesnis kaip",notInclusive:"turi būti didesnis kaip"}}},array:{unit:{one:"elementą",few:"elementus",many:"elementų"},verb:{smaller:{inclusive:"turi turėti ne daugiau kaip",notInclusive:"turi turėti mažiau kaip"},bigger:{inclusive:"turi turėti ne mažiau kaip",notInclusive:"turi turėti daugiau kaip"}}},set:{unit:{one:"elementą",few:"elementus",many:"elementų"},verb:{smaller:{inclusive:"turi turėti ne daugiau kaip",notInclusive:"turi turėti mažiau kaip"},bigger:{inclusive:"turi turėti ne mažiau kaip",notInclusive:"turi turėti daugiau kaip"}}}};function n(t,r,a,c){let u=e[t]??null;return u===null?u:{unit:u.unit[r],verb:u.verb[c][a?"inclusive":"notInclusive"]}}let i={regex:"įvestis",email:"el. pašto adresas",url:"URL",emoji:"jaustukas",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"ISO data ir laikas",date:"ISO data",time:"ISO laikas",duration:"ISO trukmė",ipv4:"IPv4 adresas",ipv6:"IPv6 adresas",mac:"MAC adresas",cidrv4:"IPv4 tinklo prefiksas (CIDR)",cidrv6:"IPv6 tinklo prefiksas (CIDR)",base64:"base64 užkoduota eilutė",base64url:"base64url užkoduota eilutė",json_string:"JSON eilutė",e164:"E.164 numeris",credit_card:"kredito kortelės numeris",currency_code:"valiutos kodas",iban:"IBAN",jwt:"JWT",template_literal:"įvestis"},o={nan:"NaN",number:"skaičius",bigint:"sveikasis skaičius",string:"eilutė",boolean:"loginė reikšmė",undefined:"neapibrėžta reikšmė",function:"funkcija",symbol:"simbolis",array:"masyvas",object:"objektas",null:"nulinė reikšmė"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`Gautas tipas ${c}, o tikėtasi - instanceof ${t.expected}`:`Gautas tipas ${c}, o tikėtasi - ${r}`}case"invalid_value":return t.values.length===1?`Privalo būti ${b(t.values[0])}`:`Privalo būti vienas iš ${v(t.values,"|")} pasirinkimų`;case"too_big":{let r=o[t.origin]??t.origin,a=n(t.origin,ip(Number(t.maximum)),t.inclusive??!1,"smaller");if(a?.verb)return`${xn(r??t.origin??"reikšmė")} ${a.verb} ${t.maximum.toString()} ${a.unit??"elementų"}`;let c=t.inclusive?"ne didesnis kaip":"mažesnis kaip";return`${xn(r??t.origin??"reikšmė")} turi būti ${c} ${t.maximum.toString()} ${a?.unit}`}case"too_small":{let r=o[t.origin]??t.origin,a=n(t.origin,ip(Number(t.minimum)),t.inclusive??!1,"bigger");if(a?.verb)return`${xn(r??t.origin??"reikšmė")} ${a.verb} ${t.minimum.toString()} ${a.unit??"elementų"}`;let c=t.inclusive?"ne mažesnis kaip":"didesnis kaip";return`${xn(r??t.origin??"reikšmė")} turi būti ${c} ${t.minimum.toString()} ${a?.unit}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`Eilutė privalo prasidėti "${r.prefix}"`:r.format==="ends_with"?`Eilutė privalo pasibaigti "${r.suffix}"`:r.format==="includes"?`Eilutė privalo įtraukti "${r.includes}"`:r.format==="regex"?`Eilutė privalo atitikti ${r.pattern}`:`Neteisingas ${i[r.format]??t.format}`}case"not_multiple_of":return`Skaičius privalo būti ${t.divisor} kartotinis.`;case"unrecognized_keys":return`Neatpažint${t.keys.length>1?"i":"as"} rakt${t.keys.length>1?"ai":"as"}: ${v(t.keys,", ")}`;case"invalid_key":return"Rastas klaidingas raktas";case"invalid_union":return"Klaidinga įvestis";case"invalid_element":{let r=o[t.origin]??t.origin;return`${xn(r??t.origin??"reikšmė")} turi klaidingą įvestį`}default:return"Klaidinga įvestis"}}};function op(){return{localeError:hh()}}var yh=()=>{let e={string:{unit:"знаци",verb:"да имаат"},file:{unit:"бајти",verb:"да имаат"},array:{unit:"ставки",verb:"да имаат"},set:{unit:"ставки",verb:"да имаат"},map:{unit:"ставки",verb:"да имаат"}};function n(t){return e[t]??null}let i={regex:"внес",email:"адреса на е-пошта",url:"URL",emoji:"емоџи",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"ISO датум и време",date:"ISO датум",time:"ISO време",duration:"ISO времетраење",ipv4:"IPv4 адреса",ipv6:"IPv6 адреса",mac:"MAC адреса",cidrv4:"IPv4 опсег",cidrv6:"IPv6 опсег",base64:"base64-енкодирана низа",base64url:"base64url-енкодирана низа",json_string:"JSON низа",e164:"E.164 број",credit_card:"број на кредитна картичка",currency_code:"код на валута",iban:"IBAN",jwt:"JWT",template_literal:"внес"},o={nan:"NaN",number:"број",array:"низа"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`Грешен внес: се очекува instanceof ${t.expected}, примено ${c}`:`Грешен внес: се очекува ${r}, примено ${c}`}case"invalid_value":return t.values.length===1?`Invalid input: expected ${b(t.values[0])}`:`Грешана опција: се очекува една ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`Премногу голем: се очекува ${t.origin??"вредноста"} да има ${r}${t.maximum.toString()} ${a.unit??"елементи"}`:`Премногу голем: се очекува ${t.origin??"вредноста"} да биде ${r}${t.maximum.toString()}`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`Премногу мал: се очекува ${t.origin} да има ${r}${t.minimum.toString()} ${a.unit}`:`Премногу мал: се очекува ${t.origin} да биде ${r}${t.minimum.toString()}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`Неважечка низа: мора да започнува со "${r.prefix}"`:r.format==="ends_with"?`Неважечка низа: мора да завршува со "${r.suffix}"`:r.format==="includes"?`Неважечка низа: мора да вклучува "${r.includes}"`:r.format==="regex"?`Неважечка низа: мора да одгоара на патернот ${r.pattern}`:`Invalid ${i[r.format]??t.format}`}case"not_multiple_of":return`Грешен број: мора да биде делив со ${t.divisor}`;case"unrecognized_keys":return`${t.keys.length>1?"Непрепознаени клучеви":"Непрепознаен клуч"}: ${v(t.keys,", ")}`;case"invalid_key":return`Грешен клуч во ${t.origin}`;case"invalid_union":return"Грешен внес";case"invalid_element":return`Грешна вредност во ${t.origin}`;default:return"Грешен внес"}}};function ap(){return{localeError:yh()}}var bh=()=>{let e={string:{unit:"aksara",verb:"mempunyai"},file:{unit:"bait",verb:"mempunyai"},array:{unit:"elemen",verb:"mempunyai"},set:{unit:"elemen",verb:"mempunyai"},map:{unit:"elemen",verb:"mempunyai"}};function n(t){return e[t]??null}let i={regex:"input",email:"alamat e-mel",url:"URL",emoji:"emoji",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"tarikh masa ISO",date:"tarikh ISO",time:"masa ISO",duration:"tempoh ISO",ipv4:"alamat IPv4",ipv6:"alamat IPv6",mac:"alamat MAC",cidrv4:"julat IPv4",cidrv6:"julat IPv6",base64:"string dikodkan base64",base64url:"string dikodkan base64url",json_string:"string JSON",e164:"nombor E.164",credit_card:"nombor kad kredit",currency_code:"kod mata wang",iban:"IBAN",jwt:"JWT",template_literal:"input"},o={nan:"NaN",number:"nombor"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`Input tidak sah: dijangka instanceof ${t.expected}, diterima ${c}`:`Input tidak sah: dijangka ${r}, diterima ${c}`}case"invalid_value":return t.values.length===1?`Input tidak sah: dijangka ${b(t.values[0])}`:`Pilihan tidak sah: dijangka salah satu daripada ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`Terlalu besar: dijangka ${t.origin??"nilai"} ${a.verb} ${r}${t.maximum.toString()} ${a.unit??"elemen"}`:`Terlalu besar: dijangka ${t.origin??"nilai"} adalah ${r}${t.maximum.toString()}`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`Terlalu kecil: dijangka ${t.origin} ${a.verb} ${r}${t.minimum.toString()} ${a.unit}`:`Terlalu kecil: dijangka ${t.origin} adalah ${r}${t.minimum.toString()}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`String tidak sah: mesti bermula dengan "${r.prefix}"`:r.format==="ends_with"?`String tidak sah: mesti berakhir dengan "${r.suffix}"`:r.format==="includes"?`String tidak sah: mesti mengandungi "${r.includes}"`:r.format==="regex"?`String tidak sah: mesti sepadan dengan corak ${r.pattern}`:`${i[r.format]??t.format} tidak sah`}case"not_multiple_of":return`Nombor tidak sah: perlu gandaan ${t.divisor}`;case"unrecognized_keys":return`Kunci tidak dikenali: ${v(t.keys,", ")}`;case"invalid_key":return`Kunci tidak sah dalam ${t.origin}`;case"invalid_union":return"Input tidak sah";case"invalid_element":return`Nilai tidak sah dalam ${t.origin}`;default:return"Input tidak sah"}}};function cp(){return{localeError:bh()}}var $h=()=>{let e={string:{unit:"अक्षर",verb:"हुनुपर्छ"},file:{unit:"बाइट",verb:"हुनुपर्छ"},array:{unit:"तत्व",verb:"हुनुपर्छ"},set:{unit:"तत्व",verb:"हुनुपर्छ"},map:{unit:"प्रविष्टि",verb:"हुनुपर्छ"}};function n(t){return e[t]??null}let i={regex:"इनपुट",email:"इमेल ठेगाना",url:"URL",emoji:"इमोजी",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"ISO मिति र समय",date:"ISO मिति",time:"ISO समय",duration:"ISO अवधि",ipv4:"IPv4 ठेगाना",ipv6:"IPv6 ठेगाना",mac:"MAC ठेगाना",cidrv4:"IPv4 दायरा",cidrv6:"IPv6 दायरा",base64:"base64-इन्कोड गरिएको स्ट्रिङ",base64url:"base64url-इन्कोड गरिएको स्ट्रिङ",json_string:"JSON स्ट्रिङ",e164:"E.164 नम्बर",credit_card:"क्रेडिट कार्ड नम्बर",currency_code:"मुद्रा कोड",iban:"IBAN",jwt:"JWT",template_literal:"इनपुट"},o={nan:"NaN"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return`अमान्य इनपुट: अपेक्षित ${r}, प्राप्त ${c}`}case"invalid_value":return t.values.length===1?`अमान्य इनपुट: अपेक्षित ${b(t.values[0])}`:`अमान्य विकल्प: अपेक्षित मानहरू मध्ये एक ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`धेरै ठूलो: ${t.origin??"मान"} मा ${r}${t.maximum.toString()} ${a.unit} ${a.verb}`:`धेरै ठूलो: ${t.origin??"मान"} ${r}${t.maximum.toString()} हुनुपर्छ`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`धेरै सानो: ${t.origin} मा ${r}${t.minimum.toString()} ${a.unit} ${a.verb}`:`धेरै सानो: ${t.origin} ${r}${t.minimum.toString()} हुनुपर्छ`}case"invalid_format":{let r=t;return r.format==="starts_with"?`अमान्य स्ट्रिङ: "${r.prefix}" बाट सुरु हुनुपर्छ`:r.format==="ends_with"?`अमान्य स्ट्रिङ: "${r.suffix}" मा समाप्त हुनुपर्छ`:r.format==="includes"?`अमान्य स्ट्रिङ: "${r.includes}" समावेश हुनुपर्छ`:r.format==="regex"?`अमान्य स्ट्रिङ: ढाँचा ${r.pattern} सँग मेल खानुपर्छ`:`अमान्य ${i[r.format]??t.format}`}case"not_multiple_of":return`अमान्य संख्या: ${t.divisor} को गुणज हुनुपर्छ`;case"unrecognized_keys":return`अपरिचित कुञ्जी${t.keys.length>1?"हरू":""}: ${v(t.keys,", ")}`;case"invalid_key":return`अमान्य कुञ्जी: ${t.origin} मा`;case"invalid_union":return t.options&&Array.isArray(t.options)&&t.options.length>0?`अमान्य डिस्क्रिमिनेटर मान: अपेक्षित ${t.options.map(a=>`'${a}'`).join(" | ")}`:"अमान्य इनपुट";case"invalid_element":return`अमान्य मान: ${t.origin} मा`;default:return"अमान्य इनपुट"}}};function up(){return{localeError:$h()}}var _h=()=>{let e={string:{unit:"tekens",verb:"heeft"},file:{unit:"bytes",verb:"heeft"},array:{unit:"elementen",verb:"heeft"},set:{unit:"elementen",verb:"heeft"},map:{unit:"elementen",verb:"heeft"}};function n(t){return e[t]??null}let i={regex:"invoer",email:"emailadres",url:"URL",emoji:"emoji",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"ISO datum en tijd",date:"ISO datum",time:"ISO tijd",duration:"ISO duur",ipv4:"IPv4-adres",ipv6:"IPv6-adres",mac:"MAC-adres",cidrv4:"IPv4-bereik",cidrv6:"IPv6-bereik",base64:"base64-gecodeerde tekst",base64url:"base64 URL-gecodeerde tekst",json_string:"JSON string",e164:"E.164-nummer",credit_card:"creditcardnummer",currency_code:"valutacode",iban:"IBAN",jwt:"JWT",template_literal:"invoer"},o={nan:"NaN",number:"getal"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`Ongeldige invoer: verwacht instanceof ${t.expected}, ontving ${c}`:`Ongeldige invoer: verwacht ${r}, ontving ${c}`}case"invalid_value":return t.values.length===1?`Ongeldige invoer: verwacht ${b(t.values[0])}`:`Ongeldige optie: verwacht één van ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin),c=t.origin==="date"?"laat":t.origin==="string"?"lang":"groot";return a?`Te ${c}: verwacht dat ${t.origin??"waarde"} ${r}${t.maximum.toString()} ${a.unit??"elementen"} ${a.verb}`:`Te ${c}: verwacht dat ${t.origin??"waarde"} ${r}${t.maximum.toString()} is`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin),c=t.origin==="date"?"vroeg":t.origin==="string"?"kort":"klein";return a?`Te ${c}: verwacht dat ${t.origin} ${r}${t.minimum.toString()} ${a.unit} ${a.verb}`:`Te ${c}: verwacht dat ${t.origin} ${r}${t.minimum.toString()} is`}case"invalid_format":{let r=t;return r.format==="starts_with"?`Ongeldige tekst: moet met "${r.prefix}" beginnen`:r.format==="ends_with"?`Ongeldige tekst: moet op "${r.suffix}" eindigen`:r.format==="includes"?`Ongeldige tekst: moet "${r.includes}" bevatten`:r.format==="regex"?`Ongeldige tekst: moet overeenkomen met patroon ${r.pattern}`:`Ongeldig: ${i[r.format]??t.format}`}case"not_multiple_of":return`Ongeldig getal: moet een veelvoud van ${t.divisor} zijn`;case"unrecognized_keys":return`Onbekende key${t.keys.length>1?"s":""}: ${v(t.keys,", ")}`;case"invalid_key":return`Ongeldige key in ${t.origin}`;case"invalid_union":return"Ongeldige invoer";case"invalid_element":return`Ongeldige waarde in ${t.origin}`;default:return"Ongeldige invoer"}}};function sp(){return{localeError:_h()}}var kh=()=>{let e={string:{unit:"teikn",verb:"å ha"},file:{unit:"bytes",verb:"å ha"},array:{unit:"element",verb:"å innehalde"},set:{unit:"element",verb:"å innehalde"},map:{unit:"element",verb:"å innehalde"}};function n(t){return e[t]??null}let i={regex:"input",email:"e-postadresse",url:"URL",emoji:"emoji",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"ISO dato- og klokkeslett",date:"ISO-dato",time:"ISO-klokkeslett",duration:"ISO-varigheit",ipv4:"IPv4-adresse",ipv6:"IPv6-adresse",mac:"MAC-adresse",cidrv4:"IPv4-spekter",cidrv6:"IPv6-spekter",base64:"base64-enkoda streng",base64url:"base64url-enkoda streng",json_string:"JSON-streng",e164:"E.164-nummer",credit_card:"kredittkortnummer",currency_code:"valutakode",iban:"IBAN",jwt:"JWT",template_literal:"input"},o={nan:"NaN",number:"tal",array:"liste"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`Ugyldig input: forventa instanceof ${t.expected}, fekk ${c}`:`Ugyldig input: forventa ${r}, fekk ${c}`}case"invalid_value":return t.values.length===1?`Ugyldig verdi: forventa ${b(t.values[0])}`:`Ugyldig val: forventa eitt av ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`For stor(t): forventa ${t.origin??"value"} til å ha ${r}${t.maximum.toString()} ${a.unit??"element"}`:`For stor(t): forventa ${t.origin??"value"} til å ha ${r}${t.maximum.toString()}`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`For lite(n): forventa ${t.origin} til å ha ${r}${t.minimum.toString()} ${a.unit}`:`For lite(n): forventa ${t.origin} til å ha ${r}${t.minimum.toString()}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`Ugyldig streng: må starte med "${r.prefix}"`:r.format==="ends_with"?`Ugyldig streng: må slutte med "${r.suffix}"`:r.format==="includes"?`Ugyldig streng: må innehalde "${r.includes}"`:r.format==="regex"?`Ugyldig streng: må matche mønsteret ${r.pattern}`:`Ugyldig ${i[r.format]??t.format}`}case"not_multiple_of":return`Ugyldig tal: må vere eit multiplum av ${t.divisor}`;case"unrecognized_keys":return`${t.keys.length>1?"Ukjende nøklar":"Ukjend nøkkel"}: ${v(t.keys,", ")}`;case"invalid_key":return`Ugyldig nøkkel i ${t.origin}`;case"invalid_union":return"Ugyldig input";case"invalid_element":return`Ugyldig verdi i ${t.origin}`;default:return"Ugyldig input"}}};function lp(){return{localeError:kh()}}var xh=()=>{let e={string:{unit:"tegn",verb:"å ha"},file:{unit:"bytes",verb:"å ha"},array:{unit:"elementer",verb:"å inneholde"},set:{unit:"elementer",verb:"å inneholde"},map:{unit:"elementer",verb:"å inneholde"}};function n(t){return e[t]??null}let i={regex:"input",email:"e-postadresse",url:"URL",emoji:"emoji",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"ISO dato- og klokkeslett",date:"ISO-dato",time:"ISO-klokkeslett",duration:"ISO-varighet",ipv4:"IPv4-adresse",ipv6:"IPv6-adresse",mac:"MAC-adresse",cidrv4:"IPv4-spekter",cidrv6:"IPv6-spekter",base64:"base64-enkodet streng",base64url:"base64url-enkodet streng",json_string:"JSON-streng",e164:"E.164-nummer",credit_card:"kredittkortnummer",currency_code:"valutakode",iban:"IBAN",jwt:"JWT",template_literal:"input"},o={nan:"NaN",number:"tall",array:"liste"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`Ugyldig input: forventet instanceof ${t.expected}, fikk ${c}`:`Ugyldig input: forventet ${r}, fikk ${c}`}case"invalid_value":return t.values.length===1?`Ugyldig verdi: forventet ${b(t.values[0])}`:`Ugyldig valg: forventet en av ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`For stor(t): forventet ${t.origin??"value"} til å ha ${r}${t.maximum.toString()} ${a.unit??"elementer"}`:`For stor(t): forventet ${t.origin??"value"} til å ha ${r}${t.maximum.toString()}`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`For lite(n): forventet ${t.origin} til å ha ${r}${t.minimum.toString()} ${a.unit}`:`For lite(n): forventet ${t.origin} til å ha ${r}${t.minimum.toString()}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`Ugyldig streng: må starte med "${r.prefix}"`:r.format==="ends_with"?`Ugyldig streng: må ende med "${r.suffix}"`:r.format==="includes"?`Ugyldig streng: må inneholde "${r.includes}"`:r.format==="regex"?`Ugyldig streng: må matche mønsteret ${r.pattern}`:`Ugyldig ${i[r.format]??t.format}`}case"not_multiple_of":return`Ugyldig tall: må være et multiplum av ${t.divisor}`;case"unrecognized_keys":return`${t.keys.length>1?"Ukjente nøkler":"Ukjent nøkkel"}: ${v(t.keys,", ")}`;case"invalid_key":return`Ugyldig nøkkel i ${t.origin}`;case"invalid_union":return"Ugyldig input";case"invalid_element":return`Ugyldig verdi i ${t.origin}`;default:return"Ugyldig input"}}};function dp(){return{localeError:xh()}}var wh=()=>{let e={string:{unit:"harf",verb:"olmalıdır"},file:{unit:"bayt",verb:"olmalıdır"},array:{unit:"unsur",verb:"olmalıdır"},set:{unit:"unsur",verb:"olmalıdır"},map:{unit:"unsur",verb:"olmalıdır"}};function n(t){return e[t]??null}let i={regex:"giren",email:"epostagâh",url:"URL",emoji:"emoji",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"ISO hengâmı",date:"ISO tarihi",time:"ISO zamanı",duration:"ISO müddeti",ipv4:"IPv4 nişânı",ipv6:"IPv6 nişânı",mac:"MAC nişânı",cidrv4:"IPv4 menzili",cidrv6:"IPv6 menzili",base64:"base64-şifreli metin",base64url:"base64url-şifreli metin",json_string:"JSON metin",e164:"E.164 sayısı",credit_card:"i'tibâr kartı numarası",currency_code:"para birimi kodu",iban:"IBAN",jwt:"JWT",template_literal:"giren"},o={nan:"NaN",number:"numara",array:"saf",null:"gayb"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`Fâsit giren: umulan instanceof ${t.expected}, alınan ${c}`:`Fâsit giren: umulan ${r}, alınan ${c}`}case"invalid_value":return t.values.length===1?`Fâsit giren: umulan ${b(t.values[0])}`:`Fâsit tercih: mûteberler ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`Fazla büyük: ${t.origin??"value"}, ${r}${t.maximum.toString()} ${a.unit??"elements"} sahip olmalıydı.`:`Fazla büyük: ${t.origin??"value"}, ${r}${t.maximum.toString()} olmalıydı.`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`Fazla küçük: ${t.origin}, ${r}${t.minimum.toString()} ${a.unit} sahip olmalıydı.`:`Fazla küçük: ${t.origin}, ${r}${t.minimum.toString()} olmalıydı.`}case"invalid_format":{let r=t;return r.format==="starts_with"?`Fâsit metin: "${r.prefix}" ile başlamalı.`:r.format==="ends_with"?`Fâsit metin: "${r.suffix}" ile bitmeli.`:r.format==="includes"?`Fâsit metin: "${r.includes}" ihtivâ etmeli.`:r.format==="regex"?`Fâsit metin: ${r.pattern} nakşına uymalı.`:`Fâsit ${i[r.format]??t.format}`}case"not_multiple_of":return`Fâsit sayı: ${t.divisor} katı olmalıydı.`;case"unrecognized_keys":return`Tanınmayan anahtar ${t.keys.length>1?"s":""}: ${v(t.keys,", ")}`;case"invalid_key":return`${t.origin} için tanınmayan anahtar var.`;case"invalid_union":return"Giren tanınamadı.";case"invalid_element":return`${t.origin} için tanınmayan kıymet var.`;default:return"Kıymet tanınamadı."}}};function pp(){return{localeError:wh()}}var Ih=()=>{let e={string:{unit:"توکي",verb:"ولري"},file:{unit:"بایټس",verb:"ولري"},array:{unit:"توکي",verb:"ولري"},set:{unit:"توکي",verb:"ولري"},map:{unit:"توکي",verb:"ولري"}};function n(t){return e[t]??null}let i={regex:"ورودي",email:"بریښنالیک",url:"یو آر ال",emoji:"ایموجي",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"نیټه او وخت",date:"نېټه",time:"وخت",duration:"موده",ipv4:"د IPv4 پته",ipv6:"د IPv6 پته",mac:"د MAC پته",cidrv4:"د IPv4 ساحه",cidrv6:"د IPv6 ساحه",base64:"base64-encoded متن",base64url:"base64url-encoded متن",json_string:"JSON متن",e164:"د E.164 شمېره",credit_card:"د کریډیټ کارت شمیره",currency_code:"د اسعارو کوډ",iban:"IBAN",jwt:"JWT",template_literal:"ورودي"},o={nan:"NaN",number:"عدد",array:"ارې"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`ناسم ورودي: باید instanceof ${t.expected} وای, مګر ${c} ترلاسه شو`:`ناسم ورودي: باید ${r} وای, مګر ${c} ترلاسه شو`}case"invalid_value":return t.values.length===1?`ناسم ورودي: باید ${b(t.values[0])} وای`:`ناسم انتخاب: باید یو له ${v(t.values,"|")} څخه وای`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`ډیر لوی: ${t.origin??"ارزښت"} باید ${r}${t.maximum.toString()} ${a.unit??"عنصرونه"} ولري`:`ډیر لوی: ${t.origin??"ارزښت"} باید ${r}${t.maximum.toString()} وي`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`ډیر کوچنی: ${t.origin} باید ${r}${t.minimum.toString()} ${a.unit} ولري`:`ډیر کوچنی: ${t.origin} باید ${r}${t.minimum.toString()} وي`}case"invalid_format":{let r=t;return r.format==="starts_with"?`ناسم متن: باید د "${r.prefix}" سره پیل شي`:r.format==="ends_with"?`ناسم متن: باید د "${r.suffix}" سره پای ته ورسيږي`:r.format==="includes"?`ناسم متن: باید "${r.includes}" ولري`:r.format==="regex"?`ناسم متن: باید د ${r.pattern} سره مطابقت ولري`:`${i[r.format]??t.format} ناسم دی`}case"not_multiple_of":return`ناسم عدد: باید د ${t.divisor} مضرب وي`;case"unrecognized_keys":return`ناسم ${t.keys.length>1?"کلیډونه":"کلیډ"}: ${v(t.keys,", ")}`;case"invalid_key":return`ناسم کلیډ په ${t.origin} کې`;case"invalid_union":return"ناسمه ورودي";case"invalid_element":return`ناسم عنصر په ${t.origin} کې`;default:return"ناسمه ورودي"}}};function fp(){return{localeError:Ih()}}var Sh=()=>{let e={string:{unit:"znaków",verb:"mieć"},file:{unit:"bajtów",verb:"mieć"},array:{unit:"elementów",verb:"mieć"},set:{unit:"elementów",verb:"mieć"},map:{unit:"elementów",verb:"mieć"}};function n(t){return e[t]??null}let i={regex:"wyrażenie",email:"adres email",url:"URL",emoji:"emoji",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"data i godzina w formacie ISO",date:"data w formacie ISO",time:"godzina w formacie ISO",duration:"czas trwania ISO",ipv4:"adres IPv4",ipv6:"adres IPv6",mac:"adres MAC",cidrv4:"zakres IPv4",cidrv6:"zakres IPv6",base64:"ciąg znaków zakodowany w formacie base64",base64url:"ciąg znaków zakodowany w formacie base64url",json_string:"ciąg znaków w formacie JSON",e164:"liczba E.164",credit_card:"numer karty kredytowej",currency_code:"kod waluty",iban:"IBAN",jwt:"JWT",template_literal:"wejście"},o={nan:"NaN",number:"liczba",array:"tablica"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`Nieprawidłowe dane wejściowe: oczekiwano instanceof ${t.expected}, otrzymano ${c}`:`Nieprawidłowe dane wejściowe: oczekiwano ${r}, otrzymano ${c}`}case"invalid_value":return t.values.length===1?`Nieprawidłowe dane wejściowe: oczekiwano ${b(t.values[0])}`:`Nieprawidłowa opcja: oczekiwano jednej z wartości ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`Za duża wartość: oczekiwano, że ${t.origin??"wartość"} będzie mieć ${r}${t.maximum.toString()} ${a.unit??"elementów"}`:`Zbyt duż(y/a/e): oczekiwano, że ${t.origin??"wartość"} będzie wynosić ${r}${t.maximum.toString()}`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`Za mała wartość: oczekiwano, że ${t.origin??"wartość"} będzie mieć ${r}${t.minimum.toString()} ${a.unit??"elementów"}`:`Zbyt mał(y/a/e): oczekiwano, że ${t.origin??"wartość"} będzie wynosić ${r}${t.minimum.toString()}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`Nieprawidłowy ciąg znaków: musi zaczynać się od "${r.prefix}"`:r.format==="ends_with"?`Nieprawidłowy ciąg znaków: musi kończyć się na "${r.suffix}"`:r.format==="includes"?`Nieprawidłowy ciąg znaków: musi zawierać "${r.includes}"`:r.format==="regex"?`Nieprawidłowy ciąg znaków: musi odpowiadać wzorcowi ${r.pattern}`:`Nieprawidłow(y/a/e) ${i[r.format]??t.format}`}case"not_multiple_of":return`Nieprawidłowa liczba: musi być wielokrotnością ${t.divisor}`;case"unrecognized_keys":return`Nierozpoznane klucze${t.keys.length>1?"s":""}: ${v(t.keys,", ")}`;case"invalid_key":return`Nieprawidłowy klucz w ${t.origin}`;case"invalid_union":return"Nieprawidłowe dane wejściowe";case"invalid_element":return`Nieprawidłowa wartość w ${t.origin}`;default:return"Nieprawidłowe dane wejściowe"}}};function mp(){return{localeError:Sh()}}var zh=()=>{let e={string:{unit:"caracteres"},file:{unit:"bytes"},array:{unit:"elementos"},set:{unit:"elementos"},map:{unit:"entradas"}};function n(a){return e[a]??null}let i={regex:"a entrada",email:"o endereço de e-mail",url:"o URL",emoji:"o emoji",uuid:"o UUID",uuidv4:"o UUIDv4",uuidv6:"o UUIDv6",nanoid:"o nanoid",guid:"o GUID",cuid:"o cuid",cuid2:"o cuid2",ulid:"o ULID",xid:"o XID",ksuid:"o KSUID",datetime:"a data e hora ISO",date:"a data ISO",time:"a hora ISO",duration:"a duração ISO",ipv4:"o endereço IPv4",ipv6:"o endereço IPv6",mac:"o endereço MAC",cidrv4:"o intervalo de endereços IPv4",cidrv6:"o intervalo de endereços IPv6",base64:"o texto codificado em base64",base64url:"o texto codificado em base64url",json_string:"o texto JSON",e164:"o número E.164",credit_card:"o número de cartão de crédito",currency_code:"o código de moeda",iban:"o IBAN",jwt:"o JWT",template_literal:"a entrada"},o={masculine:{definite:"o",indefinite:"um"},feminine:{definite:"a",indefinite:"uma"}},t={string:{name:"texto",articles:o.masculine},number:{name:"número",articles:o.masculine},int:{name:"número inteiro",articles:o.masculine},boolean:{name:"valor booleano",articles:o.masculine},bigint:{name:"número bigint",articles:o.masculine},symbol:{name:"símbolo",articles:o.masculine},undefined:{name:'valor "undefined"',articles:o.masculine},null:{name:'valor "nulo"',articles:o.masculine},never:{name:'valor "never"',articles:o.masculine},void:{name:'valor "void"',articles:o.masculine},date:{name:"data",articles:o.feminine},array:{name:"vetor",articles:o.masculine},object:{name:"objeto",articles:o.masculine},tuple:{name:"tuplo",articles:o.masculine},record:{name:"registo",articles:o.masculine},map:{name:"mapa",articles:o.masculine},set:{name:"conjunto",articles:o.masculine},file:{name:"ficheiro",articles:o.masculine},nonoptional:{name:"valor não opcional",articles:o.masculine},nan:{name:'valor "NaN"',articles:o.masculine},function:{name:"função",articles:o.feminine}};function r(a,c){let u=t[a]??{name:`valor "${a}"`,articles:o.masculine};return`${u.articles[c]} ${u.name}`}return a=>{switch(a.code){case"invalid_type":{let c=r(a.expected,"indefinite"),u=$(a.input),s=r(u,"indefinite");return`Entrada inválida: esperava ${c}, recebeu ${s}`}case"invalid_value":return a.values.length===1?`Entrada inválida: esperava ${b(a.values[0])}`:`Opção inválida: esperava uma das seguintes opções: ${v(a.values,"|")}`;case"too_big":{let c=a.inclusive?"<=":"<",u=n(a.origin);return u?`Demasiado grande: esperava que ${r(a.origin,"definite")} tivesse ${c} ${a.maximum.toString()} ${u.unit??"elementos"}`:`Demasiado grande: esperava que ${r(a.origin,"definite")} fosse ${c} ${a.maximum.toString()}`}case"too_small":{let c=a.inclusive?">=":">",u=n(a.origin);return u?`Demasiado pequeno: esperava que ${r(a.origin,"definite")} tivesse ${c} ${a.minimum.toString()} ${u.unit??"elementos"}`:`Demasiado pequeno: esperava que ${r(a.origin,"definite")} fosse ${c} ${a.minimum.toString()}`}case"invalid_format":{let c=a;return c.format==="starts_with"?`Texto inválido: deve começar por "${c.prefix}"`:c.format==="ends_with"?`Texto inválido: deve terminar em "${c.suffix}"`:c.format==="includes"?`Texto inválido: deve incluir "${c.includes}"`:c.format==="regex"?`Texto inválido: deve corresponder ao padrão ${c.pattern}`:`Formato d${i[c.format]??a.format} inválido`}case"not_multiple_of":return`Número inválido: deve ser múltiplo de ${a.divisor}`;case"unrecognized_keys":{let c=a.keys.length>1?"s":"";return`Chave${c} inválida${c}: ${v(a.keys,", ")}`}case"invalid_key":return`Entrada inválida n${r(a.origin,"definite")}`;case"invalid_union":return a.options&&Array.isArray(a.options)&&a.options.length>0?`Valor de discriminação inválido. Esperava ${a.options.map(u=>`'${u}'`).join(" | ")}`:"Entrada inválida";case"invalid_element":return`Entrada inválida n${r(a.origin,"definite")}`;default:return"Entrada inválida"}}};function gp(){return{localeError:zh()}}var Ph=()=>{let e={string:{unit:"caracteres"},file:{unit:"bytes"},array:{unit:"elementos"},set:{unit:"elementos"},map:{unit:"entradas"}};function n(a){return e[a]??null}let i={regex:"a entrada",email:"o endereço de e-mail",url:"o URL",emoji:"o emoji",uuid:"o UUID",uuidv4:"o UUIDv4",uuidv6:"o UUIDv6",nanoid:"o nanoid",guid:"o GUID",cuid:"o cuid",cuid2:"o cuid2",ulid:"o ULID",xid:"o XID",ksuid:"o KSUID",datetime:"a data e hora ISO",date:"a data ISO",time:"a hora ISO",duration:"a duração ISO",ipv4:"o endereço IPv4",ipv6:"o endereço IPv6",mac:"o endereço MAC",cidrv4:"a faixa de endereços IPv4",cidrv6:"a faixa de endereços IPv6",base64:"o texto codificado em base64",base64url:"o texto codificado em base64url",json_string:"o texto JSON",e164:"o número E.164",credit_card:"o número de cartão de crédito",currency_code:"o código de moeda",iban:"o IBAN",jwt:"o JWT",template_literal:"a entrada"},o={masculine:{definite:"o",indefinite:"um"},feminine:{definite:"a",indefinite:"uma"}},t={string:{name:"texto",articles:o.masculine},number:{name:"número",articles:o.masculine},int:{name:"número inteiro",articles:o.masculine},boolean:{name:"valor booleano",articles:o.masculine},bigint:{name:"número bigint",articles:o.masculine},symbol:{name:"símbolo",articles:o.masculine},undefined:{name:'valor "undefined"',articles:o.masculine},null:{name:'valor "nulo"',articles:o.masculine},never:{name:'valor "never"',articles:o.masculine},void:{name:'valor "void"',articles:o.masculine},date:{name:"data",articles:o.feminine},array:{name:"vetor",articles:o.masculine},object:{name:"objeto",articles:o.masculine},tuple:{name:"tupla",articles:o.feminine},record:{name:"registro",articles:o.masculine},map:{name:"mapa",articles:o.masculine},set:{name:"conjunto",articles:o.masculine},file:{name:"arquivo",articles:o.masculine},nonoptional:{name:"valor não opcional",articles:o.masculine},nan:{name:'valor "NaN"',articles:o.masculine},function:{name:"função",articles:o.feminine}};function r(a,c){let u=t[a]??{name:`valor "${a}"`,articles:o.masculine};return`${u.articles[c]} ${u.name}`}return a=>{switch(a.code){case"invalid_type":{let c=r(a.expected,"indefinite"),u=$(a.input),s=r(u,"indefinite");return`Entrada inválida: esperava ${c}, recebeu ${s}`}case"invalid_value":return a.values.length===1?`Entrada inválida: esperava ${b(a.values[0])}`:`Opção inválida: esperava uma das seguintes opções: ${v(a.values,"|")}`;case"too_big":{let c=a.inclusive?"<=":"<",u=n(a.origin);return u?`Grande demais: esperava que ${r(a.origin,"definite")} tivesse ${c} ${a.maximum.toString()} ${u.unit??"elementos"}`:`Grande demais: esperava que ${r(a.origin,"definite")} fosse ${c} ${a.maximum.toString()}`}case"too_small":{let c=a.inclusive?">=":">",u=n(a.origin);return u?`Pequeno demais: esperava que ${r(a.origin,"definite")} tivesse ${c} ${a.minimum.toString()} ${u.unit??"elementos"}`:`Pequeno demais: esperava que ${r(a.origin,"definite")} fosse ${c} ${a.minimum.toString()}`}case"invalid_format":{let c=a;return c.format==="starts_with"?`Texto inválido: deve começar com "${c.prefix}"`:c.format==="ends_with"?`Texto inválido: deve terminar com "${c.suffix}"`:c.format==="includes"?`Texto inválido: deve incluir "${c.includes}"`:c.format==="regex"?`Texto inválido: deve corresponder ao padrão ${c.pattern}`:`Formato d${i[c.format]??a.format} inválido`}case"not_multiple_of":return`Número inválido: deve ser múltiplo de ${a.divisor}`;case"unrecognized_keys":{let c=a.keys.length>1?"s":"";return`Chave${c} inválida${c}: ${v(a.keys,", ")}`}case"invalid_key":return`Entrada inválida n${r(a.origin,"definite")}`;case"invalid_union":return a.options&&Array.isArray(a.options)&&a.options.length>0?`Valor de discriminação inválido. Esperava ${a.options.map(u=>`'${u}'`).join(" | ")}`:"Entrada inválida";case"invalid_element":return`Entrada inválida n${r(a.origin,"definite")}`;default:return"Entrada inválida"}}};function vp(){return{localeError:Ph()}}var Oh=()=>{let e={string:{unit:"caractere",verb:"să aibă"},file:{unit:"octeți",verb:"să aibă"},array:{unit:"elemente",verb:"să aibă"},set:{unit:"elemente",verb:"să aibă"},map:{unit:"intrări",verb:"să aibă"}};function n(t){return e[t]??null}let i={regex:"intrare",email:"adresă de email",url:"URL",emoji:"emoji",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"dată și oră ISO",date:"dată ISO",time:"oră ISO",duration:"durată ISO",ipv4:"adresă IPv4",ipv6:"adresă IPv6",mac:"adresă MAC",cidrv4:"interval IPv4",cidrv6:"interval IPv6",base64:"șir codat base64",base64url:"șir codat base64url",json_string:"șir JSON",e164:"număr E.164",credit_card:"număr de card de credit",currency_code:"cod valutar",iban:"IBAN",jwt:"JWT",template_literal:"intrare"},o={nan:"NaN",string:"șir",number:"număr",boolean:"boolean",function:"funcție",array:"matrice",object:"obiect",undefined:"nedefinit",symbol:"simbol",bigint:"număr mare",void:"void",never:"never",map:"hartă",set:"set"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return`Intrare invalidă: așteptat ${r}, primit ${c}`}case"invalid_value":return t.values.length===1?`Intrare invalidă: așteptat ${b(t.values[0])}`:`Opțiune invalidă: așteptat una dintre ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`Prea mare: așteptat ca ${t.origin??"valoarea"} ${a.verb} ${r}${t.maximum.toString()} ${a.unit??"elemente"}`:`Prea mare: așteptat ca ${t.origin??"valoarea"} să fie ${r}${t.maximum.toString()}`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`Prea mic: așteptat ca ${t.origin} ${a.verb} ${r}${t.minimum.toString()} ${a.unit}`:`Prea mic: așteptat ca ${t.origin} să fie ${r}${t.minimum.toString()}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`Șir invalid: trebuie să înceapă cu "${r.prefix}"`:r.format==="ends_with"?`Șir invalid: trebuie să se termine cu "${r.suffix}"`:r.format==="includes"?`Șir invalid: trebuie să includă "${r.includes}"`:r.format==="regex"?`Șir invalid: trebuie să se potrivească cu modelul ${r.pattern}`:`Format invalid: ${i[r.format]??t.format}`}case"not_multiple_of":return`Număr invalid: trebuie să fie multiplu de ${t.divisor}`;case"unrecognized_keys":return`Chei nerecunoscute: ${v(t.keys,", ")}`;case"invalid_key":return`Cheie invalidă în ${t.origin}`;case"invalid_union":return"Intrare invalidă";case"invalid_element":return`Valoare invalidă în ${t.origin}`;default:return"Intrare invalidă"}}};function hp(){return{localeError:Oh()}}function yp(e,n,i,o){let t=Math.abs(e),r=t%10,a=t%100;return a>=11&&a<=19?o:r===1?n:r>=2&&r<=4?i:o}var jh=()=>{let e={string:{unit:{one:"символ",few:"символа",many:"символов"},verb:"иметь"},file:{unit:{one:"байт",few:"байта",many:"байт"},verb:"иметь"},array:{unit:{one:"элемент",few:"элемента",many:"элементов"},verb:"иметь"},set:{unit:{one:"элемент",few:"элемента",many:"элементов"},verb:"иметь"},map:{unit:{one:"элемент",few:"элемента",many:"элементов"},verb:"иметь"}};function n(t){return e[t]??null}let i={regex:"ввод",email:"email адрес",url:"URL",emoji:"эмодзи",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"ISO дата и время",date:"ISO дата",time:"ISO время",duration:"ISO длительность",ipv4:"IPv4 адрес",ipv6:"IPv6 адрес",mac:"MAC адрес",cidrv4:"IPv4 диапазон",cidrv6:"IPv6 диапазон",base64:"строка в формате base64",base64url:"строка в формате base64url",json_string:"JSON строка",e164:"номер E.164",credit_card:"номер кредитной карты",currency_code:"код валюты",iban:"IBAN",jwt:"JWT",template_literal:"ввод"},o={nan:"NaN",number:"число",array:"массив"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`Неверный ввод: ожидалось instanceof ${t.expected}, получено ${c}`:`Неверный ввод: ожидалось ${r}, получено ${c}`}case"invalid_value":return t.values.length===1?`Неверный ввод: ожидалось ${b(t.values[0])}`:`Неверный вариант: ожидалось одно из ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);if(a){let c=Number(t.maximum),u=yp(c,a.unit.one,a.unit.few,a.unit.many);return`Слишком большое значение: ожидалось, что ${t.origin??"значение"} будет иметь ${r}${t.maximum.toString()} ${u}`}return`Слишком большое значение: ожидалось, что ${t.origin??"значение"} будет ${r}${t.maximum.toString()}`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);if(a){let c=Number(t.minimum),u=yp(c,a.unit.one,a.unit.few,a.unit.many);return`Слишком маленькое значение: ожидалось, что ${t.origin} будет иметь ${r}${t.minimum.toString()} ${u}`}return`Слишком маленькое значение: ожидалось, что ${t.origin} будет ${r}${t.minimum.toString()}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`Неверная строка: должна начинаться с "${r.prefix}"`:r.format==="ends_with"?`Неверная строка: должна заканчиваться на "${r.suffix}"`:r.format==="includes"?`Неверная строка: должна содержать "${r.includes}"`:r.format==="regex"?`Неверная строка: должна соответствовать шаблону ${r.pattern}`:`Неверный ${i[r.format]??t.format}`}case"not_multiple_of":return`Неверное число: должно быть кратным ${t.divisor}`;case"unrecognized_keys":return`Нераспознанн${t.keys.length>1?"ые":"ый"} ключ${t.keys.length>1?"и":""}: ${v(t.keys,", ")}`;case"invalid_key":return`Неверный ключ в ${t.origin}`;case"invalid_union":return"Неверные входные данные";case"invalid_element":return`Неверное значение в ${t.origin}`;default:return"Неверные входные данные"}}};function bp(){return{localeError:jh()}}var Nh=()=>{let e={string:{unit:"znakov",verb:"mať"},file:{unit:"bajtov",verb:"mať"},array:{unit:"prvkov",verb:"mať"},set:{unit:"prvkov",verb:"mať"},map:{unit:"položiek",verb:"mať"}};function n(t){return e[t]??null}let i={regex:"regulárny výraz",email:"e-mailová adresa",url:"URL",emoji:"emoji",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"dátum a čas vo formáte ISO",date:"dátum vo formáte ISO",time:"čas vo formáte ISO",duration:"doba trvania ISO",ipv4:"IPv4 adresa",ipv6:"IPv6 adresa",mac:"MAC adresa",cidrv4:"rozsah IPv4",cidrv6:"rozsah IPv6",base64:"reťazec zakódovaný vo formáte base64",base64url:"reťazec zakódovaný vo formáte base64url",json_string:"reťazec vo formáte JSON",e164:"číslo E.164",credit_card:"číslo kreditnej karty",currency_code:"kód meny",iban:"IBAN",jwt:"JWT",template_literal:"vstup"},o={nan:"NaN",number:"číslo",string:"reťazec",function:"funkcia",array:"pole"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`Neplatný vstup: očakávané instanceof ${t.expected}, obdržané ${c}`:`Neplatný vstup: očakávané ${r}, obdržané ${c}`}case"invalid_value":return t.values.length===1?`Neplatný vstup: očakávané ${b(t.values[0])}`:`Neplatný vstup: očakávaná jedna z hodnôt ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`Hodnota je príliš veľká: ${t.origin??"hodnota"} musí mať ${r}${t.maximum.toString()} ${a.unit??"prvkov"}`:`Hodnota je príliš veľká: ${t.origin??"hodnota"} musí byť ${r}${t.maximum.toString()}`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`Hodnota je príliš malá: ${t.origin??"hodnota"} musí mať ${r}${t.minimum.toString()} ${a.unit??"prvkov"}`:`Hodnota je príliš malá: ${t.origin??"hodnota"} musí byť ${r}${t.minimum.toString()}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`Neplatný reťazec: musí začínať na "${r.prefix}"`:r.format==="ends_with"?`Neplatný reťazec: musí končiť na "${r.suffix}"`:r.format==="includes"?`Neplatný reťazec: musí obsahovať "${r.includes}"`:r.format==="regex"?`Neplatný reťazec: musí zodpovedať vzoru ${r.pattern}`:`Neplatný formát ${i[r.format]??t.format}`}case"not_multiple_of":return`Neplatné číslo: musí byť násobkom ${t.divisor}`;case"unrecognized_keys":return`Neznáme klúče: ${v(t.keys,", ")}`;case"invalid_key":return`Neplatný klúč v ${t.origin}`;case"invalid_union":return"Neplatný vstup";case"invalid_element":return`Neplatná hodnota v ${t.origin}`;default:return"Neplatný vstup"}}};function $p(){return{localeError:Nh()}}var Eh=()=>{let e={string:{unit:"znakov",verb:"imeti"},file:{unit:"bajtov",verb:"imeti"},array:{unit:"elementov",verb:"imeti"},set:{unit:"elementov",verb:"imeti"},map:{unit:"elementov",verb:"imeti"}};function n(t){return e[t]??null}let i={regex:"vnos",email:"e-poštni naslov",url:"URL",emoji:"emoji",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"ISO datum in čas",date:"ISO datum",time:"ISO čas",duration:"ISO trajanje",ipv4:"IPv4 naslov",ipv6:"IPv6 naslov",mac:"MAC naslov",cidrv4:"obseg IPv4",cidrv6:"obseg IPv6",base64:"base64 kodiran niz",base64url:"base64url kodiran niz",json_string:"JSON niz",e164:"E.164 številka",credit_card:"številka kreditne kartice",currency_code:"koda valute",iban:"IBAN",jwt:"JWT",template_literal:"vnos"},o={nan:"NaN",number:"število",array:"tabela"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`Neveljaven vnos: pričakovano instanceof ${t.expected}, prejeto ${c}`:`Neveljaven vnos: pričakovano ${r}, prejeto ${c}`}case"invalid_value":return t.values.length===1?`Neveljaven vnos: pričakovano ${b(t.values[0])}`:`Neveljavna možnost: pričakovano eno izmed ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`Preveliko: pričakovano, da bo ${t.origin??"vrednost"} imelo ${r}${t.maximum.toString()} ${a.unit??"elementov"}`:`Preveliko: pričakovano, da bo ${t.origin??"vrednost"} ${r}${t.maximum.toString()}`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`Premajhno: pričakovano, da bo ${t.origin} imelo ${r}${t.minimum.toString()} ${a.unit}`:`Premajhno: pričakovano, da bo ${t.origin} ${r}${t.minimum.toString()}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`Neveljaven niz: mora se začeti z "${r.prefix}"`:r.format==="ends_with"?`Neveljaven niz: mora se končati z "${r.suffix}"`:r.format==="includes"?`Neveljaven niz: mora vsebovati "${r.includes}"`:r.format==="regex"?`Neveljaven niz: mora ustrezati vzorcu ${r.pattern}`:`Neveljaven ${i[r.format]??t.format}`}case"not_multiple_of":return`Neveljavno število: mora biti večkratnik ${t.divisor}`;case"unrecognized_keys":return`Neprepoznan${t.keys.length>1?"i ključi":" ključ"}: ${v(t.keys,", ")}`;case"invalid_key":return`Neveljaven ključ v ${t.origin}`;case"invalid_union":return"Neveljaven vnos";case"invalid_element":return`Neveljavna vrednost v ${t.origin}`;default:return"Neveljaven vnos"}}};function _p(){return{localeError:Eh()}}var Dh=()=>{let e={string:{unit:"tecken",verb:"att ha"},file:{unit:"bytes",verb:"att ha"},array:{unit:"objekt",verb:"att innehålla"},set:{unit:"objekt",verb:"att innehålla"},map:{unit:"objekt",verb:"att innehålla"}};function n(t){return e[t]??null}let i={regex:"reguljärt uttryck",email:"e-postadress",url:"URL",emoji:"emoji",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"ISO-datum och tid",date:"ISO-datum",time:"ISO-tid",duration:"ISO-varaktighet",ipv4:"IPv4-adress",ipv6:"IPv6-adress",mac:"MAC-adress",cidrv4:"IPv4-spektrum",cidrv6:"IPv6-spektrum",base64:"base64-kodad sträng",base64url:"base64url-kodad sträng",json_string:"JSON-sträng",e164:"E.164-nummer",credit_card:"kreditkortsnummer",currency_code:"valutakod",iban:"IBAN",jwt:"JWT",template_literal:"mall-literal"},o={nan:"NaN",number:"antal",array:"lista"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`Ogiltig inmatning: förväntat instanceof ${t.expected}, fick ${c}`:`Ogiltig inmatning: förväntat ${r}, fick ${c}`}case"invalid_value":return t.values.length===1?`Ogiltig inmatning: förväntat ${b(t.values[0])}`:`Ogiltigt val: förväntade en av ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`För stor(t): förväntade ${t.origin??"värdet"} att ha ${r}${t.maximum.toString()} ${a.unit??"element"}`:`För stor(t): förväntat ${t.origin??"värdet"} att ha ${r}${t.maximum.toString()}`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`För lite(t): förväntade ${t.origin??"värdet"} att ha ${r}${t.minimum.toString()} ${a.unit}`:`För lite(t): förväntade ${t.origin??"värdet"} att ha ${r}${t.minimum.toString()}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`Ogiltig sträng: måste börja med "${r.prefix}"`:r.format==="ends_with"?`Ogiltig sträng: måste sluta med "${r.suffix}"`:r.format==="includes"?`Ogiltig sträng: måste innehålla "${r.includes}"`:r.format==="regex"?`Ogiltig sträng: måste matcha mönstret "${r.pattern}"`:`Ogiltig(t) ${i[r.format]??t.format}`}case"not_multiple_of":return`Ogiltigt tal: måste vara en multipel av ${t.divisor}`;case"unrecognized_keys":return`${t.keys.length>1?"Okända nycklar":"Okänd nyckel"}: ${v(t.keys,", ")}`;case"invalid_key":return`Ogiltig nyckel i ${t.origin??"värdet"}`;case"invalid_union":return"Ogiltig input";case"invalid_element":return`Ogiltigt värde i ${t.origin??"värdet"}`;default:return"Ogiltig input"}}};function kp(){return{localeError:Dh()}}var Th=()=>{let e={string:{unit:"எழுத்துக்கள்",verb:"கொண்டிருக்க வேண்டும்"},file:{unit:"பைட்டுகள்",verb:"கொண்டிருக்க வேண்டும்"},array:{unit:"உறுப்புகள்",verb:"கொண்டிருக்க வேண்டும்"},set:{unit:"உறுப்புகள்",verb:"கொண்டிருக்க வேண்டும்"},map:{unit:"உறுப்புகள்",verb:"கொண்டிருக்க வேண்டும்"}};function n(t){return e[t]??null}let i={regex:"உள்ளீடு",email:"மின்னஞ்சல் முகவரி",url:"URL",emoji:"emoji",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"ISO தேதி நேரம்",date:"ISO தேதி",time:"ISO நேரம்",duration:"ISO கால அளவு",ipv4:"IPv4 முகவரி",ipv6:"IPv6 முகவரி",mac:"MAC முகவரி",cidrv4:"IPv4 வரம்பு",cidrv6:"IPv6 வரம்பு",base64:"base64-encoded சரம்",base64url:"base64url-encoded சரம்",json_string:"JSON சரம்",e164:"E.164 எண்",credit_card:"கடன் அட்டை எண்",currency_code:"நாணயக் குறியீடு",iban:"IBAN",jwt:"JWT",template_literal:"input"},o={nan:"NaN",number:"எண்",array:"அணி",null:"வெறுமை"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`தவறான உள்ளீடு: எதிர்பார்க்கப்பட்டது instanceof ${t.expected}, பெறப்பட்டது ${c}`:`தவறான உள்ளீடு: எதிர்பார்க்கப்பட்டது ${r}, பெறப்பட்டது ${c}`}case"invalid_value":return t.values.length===1?`தவறான உள்ளீடு: எதிர்பார்க்கப்பட்டது ${b(t.values[0])}`:`தவறான விருப்பம்: எதிர்பார்க்கப்பட்டது ${v(t.values,"|")} இல் ஒன்று`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`மிக பெரியது: எதிர்பார்க்கப்பட்டது ${t.origin??"மதிப்பு"} ${r}${t.maximum.toString()} ${a.unit??"உறுப்புகள்"} ஆக இருக்க வேண்டும்`:`மிக பெரியது: எதிர்பார்க்கப்பட்டது ${t.origin??"மதிப்பு"} ${r}${t.maximum.toString()} ஆக இருக்க வேண்டும்`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`மிகச் சிறியது: எதிர்பார்க்கப்பட்டது ${t.origin} ${r}${t.minimum.toString()} ${a.unit} ஆக இருக்க வேண்டும்`:`மிகச் சிறியது: எதிர்பார்க்கப்பட்டது ${t.origin} ${r}${t.minimum.toString()} ஆக இருக்க வேண்டும்`}case"invalid_format":{let r=t;return r.format==="starts_with"?`தவறான சரம்: "${r.prefix}" இல் தொடங்க வேண்டும்`:r.format==="ends_with"?`தவறான சரம்: "${r.suffix}" இல் முடிவடைய வேண்டும்`:r.format==="includes"?`தவறான சரம்: "${r.includes}" ஐ உள்ளடக்க வேண்டும்`:r.format==="regex"?`தவறான சரம்: ${r.pattern} முறைபாட்டுடன் பொருந்த வேண்டும்`:`தவறான ${i[r.format]??t.format}`}case"not_multiple_of":return`தவறான எண்: ${t.divisor} இன் பலமாக இருக்க வேண்டும்`;case"unrecognized_keys":return`அடையாளம் தெரியாத விசை${t.keys.length>1?"கள்":""}: ${v(t.keys,", ")}`;case"invalid_key":return`${t.origin} இல் தவறான விசை`;case"invalid_union":return"தவறான உள்ளீடு";case"invalid_element":return`${t.origin} இல் தவறான மதிப்பு`;default:return"தவறான உள்ளீடு"}}};function xp(){return{localeError:Th()}}var Ah=()=>{let e={string:{unit:"аломат",verb:"дошта бошад"},file:{unit:"байт",verb:"дошта бошад"},array:{unit:"унсур",verb:"дошта бошад"},set:{unit:"унсур",verb:"дошта бошад"},map:{unit:"сабт",verb:"дошта бошад"}};function n(t){return e[t]??null}let i={regex:"вуруд",email:"суроғаи email",url:"URL",emoji:"эмоҷи",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"санаву вақти ISO",date:"санаи ISO",time:"вақти ISO",duration:"давомнокии ISO",ipv4:"суроғаи IPv4",ipv6:"суроғаи IPv6",mac:"суроғаи MAC",cidrv4:"маҳдудаи IPv4",cidrv6:"маҳдудаи IPv6",base64:"сатри дар формати base64",base64url:"сатри дар формати base64url",json_string:"сатри JSON",e164:"рақами E.164",credit_card:"рақами корти кредитӣ",currency_code:"рамзи асъор",iban:"IBAN",jwt:"JWT",template_literal:"вуруд"},o={nan:"NaN",number:"рақам",string:"сатр",array:"массив",object:"объект",date:"сана"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return`Вуруди нодуруст: ${r} интизор мерафт, ${c} гирифта шуд`}case"invalid_value":return t.values.length===1?`Вуруди нодуруст: ${b(t.values[0])} интизор мерафт`:`Интихоби нодуруст: яке аз ${v(t.values,"|")} интизор мерафт`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`Хеле калон: ${t.origin??"қимат"} бояд ${r}${t.maximum.toString()} ${a.unit} ${a.verb}`:`Хеле калон: ${t.origin??"қимат"} бояд ${r}${t.maximum.toString()} бошад`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`Хеле хурд: ${t.origin} бояд ${r}${t.minimum.toString()} ${a.unit} ${a.verb}`:`Хеле хурд: ${t.origin} бояд ${r}${t.minimum.toString()} бошад`}case"invalid_format":{let r=t;return r.format==="starts_with"?`Сатри нодуруст: бояд бо "${r.prefix}" оғоз шавад`:r.format==="ends_with"?`Сатри нодуруст: бояд бо "${r.suffix}" анҷом ёбад`:r.format==="includes"?`Сатри нодуруст: бояд "${r.includes}"-ро дар бар гирад`:r.format==="regex"?`Сатри нодуруст: бояд ба намунаи ${r.pattern} мувофиқат кунад`:`${i[r.format]??t.format}-и нодуруст`}case"not_multiple_of":return`Рақами нодуруст: бояд ба ${t.divisor} бе бақия тақсим шавад`;case"unrecognized_keys":return`Калид${t.keys.length>1?"ҳои":"и"} номаълум: ${v(t.keys,", ")}`;case"invalid_key":return`Калиди нодуруст дар ${t.origin}`;case"invalid_union":return t.options&&Array.isArray(t.options)&&t.options.length>0?`Қимати нодурусти дискриминатор: ${t.options.map(a=>`'${a}'`).join(" | ")} интизор мерафт`:"Вуруди нодуруст";case"invalid_element":return`Қимати нодуруст дар ${t.origin}`;default:return"Вуруди нодуруст"}}};function wp(){return{localeError:Ah()}}var Uh=()=>{let e={string:{unit:"ตัวอักษร",verb:"ควรมี"},file:{unit:"ไบต์",verb:"ควรมี"},array:{unit:"รายการ",verb:"ควรมี"},set:{unit:"รายการ",verb:"ควรมี"},map:{unit:"รายการ",verb:"ควรมี"}};function n(t){return e[t]??null}let i={regex:"ข้อมูลที่ป้อน",email:"ที่อยู่อีเมล",url:"URL",emoji:"อิโมจิ",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"วันที่เวลาแบบ ISO",date:"วันที่แบบ ISO",time:"เวลาแบบ ISO",duration:"ช่วงเวลาแบบ ISO",ipv4:"ที่อยู่ IPv4",ipv6:"ที่อยู่ IPv6",mac:"ที่อยู่ MAC",cidrv4:"ช่วง IP แบบ IPv4",cidrv6:"ช่วง IP แบบ IPv6",base64:"ข้อความแบบ Base64",base64url:"ข้อความแบบ Base64 สำหรับ URL",json_string:"ข้อความแบบ JSON",e164:"เบอร์โทรศัพท์ระหว่างประเทศ (E.164)",credit_card:"หมายเลขบัตรเครดิต",currency_code:"รหัสสกุลเงิน",iban:"IBAN",jwt:"โทเคน JWT",template_literal:"ข้อมูลที่ป้อน"},o={nan:"NaN",number:"ตัวเลข",array:"อาร์เรย์ (Array)",null:"ไม่มีค่า (null)"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`ประเภทข้อมูลไม่ถูกต้อง: ควรเป็น instanceof ${t.expected} แต่ได้รับ ${c}`:`ประเภทข้อมูลไม่ถูกต้อง: ควรเป็น ${r} แต่ได้รับ ${c}`}case"invalid_value":return t.values.length===1?`ค่าไม่ถูกต้อง: ควรเป็น ${b(t.values[0])}`:`ตัวเลือกไม่ถูกต้อง: ควรเป็นหนึ่งใน ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"ไม่เกิน":"น้อยกว่า",a=n(t.origin);return a?`เกินกำหนด: ${t.origin??"ค่า"} ควรมี${r} ${t.maximum.toString()} ${a.unit??"รายการ"}`:`เกินกำหนด: ${t.origin??"ค่า"} ควรมี${r} ${t.maximum.toString()}`}case"too_small":{let r=t.inclusive?"อย่างน้อย":"มากกว่า",a=n(t.origin);return a?`น้อยกว่ากำหนด: ${t.origin} ควรมี${r} ${t.minimum.toString()} ${a.unit}`:`น้อยกว่ากำหนด: ${t.origin} ควรมี${r} ${t.minimum.toString()}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`รูปแบบไม่ถูกต้อง: ข้อความต้องขึ้นต้นด้วย "${r.prefix}"`:r.format==="ends_with"?`รูปแบบไม่ถูกต้อง: ข้อความต้องลงท้ายด้วย "${r.suffix}"`:r.format==="includes"?`รูปแบบไม่ถูกต้อง: ข้อความต้องมี "${r.includes}" อยู่ในข้อความ`:r.format==="regex"?`รูปแบบไม่ถูกต้อง: ต้องตรงกับรูปแบบที่กำหนด ${r.pattern}`:`รูปแบบไม่ถูกต้อง: ${i[r.format]??t.format}`}case"not_multiple_of":return`ตัวเลขไม่ถูกต้อง: ต้องเป็นจำนวนที่หารด้วย ${t.divisor} ได้ลงตัว`;case"unrecognized_keys":return`พบคีย์ที่ไม่รู้จัก: ${v(t.keys,", ")}`;case"invalid_key":return`คีย์ไม่ถูกต้องใน ${t.origin}`;case"invalid_union":return"ข้อมูลไม่ถูกต้อง: ไม่ตรงกับรูปแบบยูเนียนที่กำหนดไว้";case"invalid_element":return`ข้อมูลไม่ถูกต้องใน ${t.origin}`;default:return"ข้อมูลไม่ถูกต้อง"}}};function Ip(){return{localeError:Uh()}}var Lh=()=>{let e={string:{unit:"simwol",verb:"bolmaly"},file:{unit:"baýt",verb:"bolmaly"},array:{unit:"elementler",verb:"bolmaly"},set:{unit:"elementler",verb:"bolmaly"},map:{unit:"elementler",verb:"bolmaly"}};function n(t){return e[t]??null}let i={regex:"giriş",email:"e-poçta salgysy",url:"URL",emoji:"emoji",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"ISO sene we wagt",date:"ISO sene",time:"ISO wagt",duration:"ISO wagt aralygy",ipv4:"IPv4 salgysy",ipv6:"IPv6 salgysy",mac:"MAC salgysy",cidrv4:"IPv4 aralygy",cidrv6:"IPv6 aralygy",base64:"base64 bilen şifrlenen setir",base64url:"base64url bilen şifrlenen setir",json_string:"JSON setiri",e164:"E.164 nomeri",credit_card:"kredit kartynyň nomeri",currency_code:"walýuta kody",iban:"IBAN",jwt:"JWT",template_literal:"şablon"},o={nan:"NaN"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return`Nädogry baha: garaşylan ${r} ýerine ${c} alyndy`}case"invalid_value":return t.values.length===1?`Nädogry baha: ${b(t.values[0])} bolmaly`:`Nädogry saýlaw: aşakdakylardan biri bolmaly: ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`Has uly: garaşylýan ${t.origin??"baha"} ${r} ${t.maximum.toString()} ${a.unit??"element"}`:`Has uly: garaşylýan ${t.origin??"baha"} ${r} ${t.maximum.toString()}`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`Has kiçi: garaşylýan ${t.origin} ${r} ${t.minimum.toString()} ${a.unit}`:`Has kiçi: garaşylýan ${t.origin} ${r} ${t.minimum.toString()}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`Nädogry setir: "${r.prefix}" bilen başlamaly`:r.format==="ends_with"?`Nädogry setir: "${r.suffix}" bilen gutarmaly`:r.format==="includes"?`Nädogry setir: "${r.includes}" saklamaly`:r.format==="regex"?`Nädogry setir: ${r.pattern} nusga laýyk bolmaly`:`Nädogry ${i[r.format]??t.format}`}case"not_multiple_of":return`Nädogry san: ${t.divisor} bilen galyndysyz bölünmeli`;case"unrecognized_keys":return`Tanalmaýan açar${t.keys.length>1?"lar":""}: ${v(t.keys,", ")}`;case"invalid_key":return`${t.origin} içinde nädogry açar`;case"invalid_union":return"Nädogry baha";case"invalid_element":return`${t.origin} içinde nädogry baha`;default:return"Nädogry baha"}}};function Sp(){return{localeError:Lh()}}var Ch=()=>{let e={string:{unit:"karakter",verb:"olmalı"},file:{unit:"bayt",verb:"olmalı"},array:{unit:"öğe",verb:"olmalı"},set:{unit:"öğe",verb:"olmalı"},map:{unit:"öğe",verb:"olmalı"}};function n(t){return e[t]??null}let i={regex:"girdi",email:"e-posta adresi",url:"URL",emoji:"emoji",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"ISO tarih ve saat",date:"ISO tarih",time:"ISO saat",duration:"ISO süre",ipv4:"IPv4 adresi",ipv6:"IPv6 adresi",mac:"MAC adresi",cidrv4:"IPv4 aralığı",cidrv6:"IPv6 aralığı",base64:"base64 ile şifrelenmiş metin",base64url:"base64url ile şifrelenmiş metin",json_string:"JSON dizesi",e164:"E.164 sayısı",credit_card:"kredi kartı numarası",currency_code:"para birimi kodu",iban:"IBAN",jwt:"JWT",template_literal:"Şablon dizesi"},o={nan:"NaN"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`Geçersiz değer: beklenen instanceof ${t.expected}, alınan ${c}`:`Geçersiz değer: beklenen ${r}, alınan ${c}`}case"invalid_value":return t.values.length===1?`Geçersiz değer: beklenen ${b(t.values[0])}`:`Geçersiz seçenek: aşağıdakilerden biri olmalı: ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`Çok büyük: beklenen ${t.origin??"değer"} ${r}${t.maximum.toString()} ${a.unit??"öğe"}`:`Çok büyük: beklenen ${t.origin??"değer"} ${r}${t.maximum.toString()}`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`Çok küçük: beklenen ${t.origin} ${r}${t.minimum.toString()} ${a.unit}`:`Çok küçük: beklenen ${t.origin} ${r}${t.minimum.toString()}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`Geçersiz metin: "${r.prefix}" ile başlamalı`:r.format==="ends_with"?`Geçersiz metin: "${r.suffix}" ile bitmeli`:r.format==="includes"?`Geçersiz metin: "${r.includes}" içermeli`:r.format==="regex"?`Geçersiz metin: ${r.pattern} desenine uymalı`:`Geçersiz ${i[r.format]??t.format}`}case"not_multiple_of":return`Geçersiz sayı: ${t.divisor} ile tam bölünebilmeli`;case"unrecognized_keys":return`Tanınmayan anahtar${t.keys.length>1?"lar":""}: ${v(t.keys,", ")}`;case"invalid_key":return`${t.origin} içinde geçersiz anahtar`;case"invalid_union":return"Geçersiz değer";case"invalid_element":return`${t.origin} içinde geçersiz değer`;default:return"Geçersiz değer"}}};function zp(){return{localeError:Ch()}}var Zh=()=>{let e={string:{unit:"символів",verb:"матиме"},file:{unit:"байтів",verb:"матиме"},array:{unit:"елементів",verb:"матиме"},set:{unit:"елементів",verb:"матиме"},map:{unit:"елементів",verb:"матиме"}};function n(t){return e[t]??null}let i={regex:"вхідні дані",email:"адреса електронної пошти",url:"URL",emoji:"емодзі",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"дата та час ISO",date:"дата ISO",time:"час ISO",duration:"тривалість ISO",ipv4:"адреса IPv4",ipv6:"адреса IPv6",mac:"адреса MAC",cidrv4:"діапазон IPv4",cidrv6:"діапазон IPv6",base64:"рядок у кодуванні base64",base64url:"рядок у кодуванні base64url",json_string:"рядок JSON",e164:"номер E.164",credit_card:"номер кредитної картки",currency_code:"код валюти",iban:"IBAN",jwt:"JWT",template_literal:"вхідні дані"},o={nan:"NaN",number:"число",array:"масив"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`Неправильні вхідні дані: очікується instanceof ${t.expected}, отримано ${c}`:`Неправильні вхідні дані: очікується ${r}, отримано ${c}`}case"invalid_value":return t.values.length===1?`Неправильні вхідні дані: очікується ${b(t.values[0])}`:`Неправильна опція: очікується одне з ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`Занадто велике: очікується, що ${t.origin??"значення"} ${a.verb} ${r}${t.maximum.toString()} ${a.unit??"елементів"}`:`Занадто велике: очікується, що ${t.origin??"значення"} буде ${r}${t.maximum.toString()}`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`Занадто мале: очікується, що ${t.origin} ${a.verb} ${r}${t.minimum.toString()} ${a.unit}`:`Занадто мале: очікується, що ${t.origin} буде ${r}${t.minimum.toString()}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`Неправильний рядок: повинен починатися з "${r.prefix}"`:r.format==="ends_with"?`Неправильний рядок: повинен закінчуватися на "${r.suffix}"`:r.format==="includes"?`Неправильний рядок: повинен містити "${r.includes}"`:r.format==="regex"?`Неправильний рядок: повинен відповідати шаблону ${r.pattern}`:`Неправильний ${i[r.format]??t.format}`}case"not_multiple_of":return`Неправильне число: повинно бути кратним ${t.divisor}`;case"unrecognized_keys":return`Нерозпізнаний ключ${t.keys.length>1?"і":""}: ${v(t.keys,", ")}`;case"invalid_key":return`Неправильний ключ у ${t.origin}`;case"invalid_union":return"Неправильні вхідні дані";case"invalid_element":return`Неправильне значення у ${t.origin}`;default:return"Неправильні вхідні дані"}}};function Mr(){return{localeError:Zh()}}function Pp(){return Mr()}var Rh=()=>{let e={string:{unit:"حروف",verb:"ہونا"},file:{unit:"بائٹس",verb:"ہونا"},array:{unit:"آئٹمز",verb:"ہونا"},set:{unit:"آئٹمز",verb:"ہونا"},map:{unit:"آئٹمز",verb:"ہونا"}};function n(t){return e[t]??null}let i={regex:"ان پٹ",email:"ای میل ایڈریس",url:"یو آر ایل",emoji:"ایموجی",uuid:"یو یو آئی ڈی",uuidv4:"یو یو آئی ڈی وی 4",uuidv6:"یو یو آئی ڈی وی 6",nanoid:"نینو آئی ڈی",guid:"جی یو آئی ڈی",cuid:"سی یو آئی ڈی",cuid2:"سی یو آئی ڈی 2",ulid:"یو ایل آئی ڈی",xid:"ایکس آئی ڈی",ksuid:"کے ایس یو آئی ڈی",datetime:"آئی ایس او ڈیٹ ٹائم",date:"آئی ایس او تاریخ",time:"آئی ایس او وقت",duration:"آئی ایس او مدت",ipv4:"آئی پی وی 4 ایڈریس",ipv6:"آئی پی وی 6 ایڈریس",mac:"ایم اے سی ایڈریس",cidrv4:"آئی پی وی 4 رینج",cidrv6:"آئی پی وی 6 رینج",base64:"بیس 64 ان کوڈڈ سٹرنگ",base64url:"بیس 64 یو آر ایل ان کوڈڈ سٹرنگ",json_string:"جے ایس او این سٹرنگ",e164:"ای 164 نمبر",credit_card:"کریڈٹ کارڈ نمبر",currency_code:"کرنسی کوڈ",iban:"IBAN",jwt:"جے ڈبلیو ٹی",template_literal:"ان پٹ"},o={nan:"NaN",number:"نمبر",array:"آرے",null:"نل"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`غلط ان پٹ: instanceof ${t.expected} متوقع تھا، ${c} موصول ہوا`:`غلط ان پٹ: ${r} متوقع تھا، ${c} موصول ہوا`}case"invalid_value":return t.values.length===1?`غلط ان پٹ: ${b(t.values[0])} متوقع تھا`:`غلط آپشن: ${v(t.values,"|")} میں سے ایک متوقع تھا`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`بہت بڑا: ${t.origin??"ویلیو"} کے ${r}${t.maximum.toString()} ${a.unit??"عناصر"} ہونے متوقع تھے`:`بہت بڑا: ${t.origin??"ویلیو"} کا ${r}${t.maximum.toString()} ہونا متوقع تھا`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`بہت چھوٹا: ${t.origin} کے ${r}${t.minimum.toString()} ${a.unit} ہونے متوقع تھے`:`بہت چھوٹا: ${t.origin} کا ${r}${t.minimum.toString()} ہونا متوقع تھا`}case"invalid_format":{let r=t;return r.format==="starts_with"?`غلط سٹرنگ: "${r.prefix}" سے شروع ہونا چاہیے`:r.format==="ends_with"?`غلط سٹرنگ: "${r.suffix}" پر ختم ہونا چاہیے`:r.format==="includes"?`غلط سٹرنگ: "${r.includes}" شامل ہونا چاہیے`:r.format==="regex"?`غلط سٹرنگ: پیٹرن ${r.pattern} سے میچ ہونا چاہیے`:`غلط ${i[r.format]??t.format}`}case"not_multiple_of":return`غلط نمبر: ${t.divisor} کا مضاعف ہونا چاہیے`;case"unrecognized_keys":return`غیر تسلیم شدہ کی${t.keys.length>1?"ز":""}: ${v(t.keys,"، ")}`;case"invalid_key":return`${t.origin} میں غلط کی`;case"invalid_union":return"غلط ان پٹ";case"invalid_element":return`${t.origin} میں غلط ویلیو`;default:return"غلط ان پٹ"}}};function Op(){return{localeError:Rh()}}var Vh=()=>{let e={string:{unit:"belgi",verb:"bo‘lishi kerak"},file:{unit:"bayt",verb:"bo‘lishi kerak"},array:{unit:"element",verb:"bo‘lishi kerak"},set:{unit:"element",verb:"bo‘lishi kerak"},map:{unit:"yozuv",verb:"bo‘lishi kerak"}};function n(t){return e[t]??null}let i={regex:"kirish",email:"elektron pochta manzili",url:"URL",emoji:"emoji",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"ISO sana va vaqti",date:"ISO sana",time:"ISO vaqt",duration:"ISO davomiylik",ipv4:"IPv4 manzil",ipv6:"IPv6 manzil",mac:"MAC manzil",cidrv4:"IPv4 diapazon",cidrv6:"IPv6 diapazon",base64:"base64 kodlangan satr",base64url:"base64url kodlangan satr",json_string:"JSON satr",e164:"E.164 raqam",credit_card:"kredit karta raqami",currency_code:"valyuta kodi",iban:"IBAN",jwt:"JWT",template_literal:"kirish"},o={nan:"NaN",number:"raqam",array:"massiv"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`Noto‘g‘ri kirish: kutilgan instanceof ${t.expected}, qabul qilingan ${c}`:`Noto‘g‘ri kirish: kutilgan ${r}, qabul qilingan ${c}`}case"invalid_value":return t.values.length===1?`Noto‘g‘ri kirish: kutilgan ${b(t.values[0])}`:`Noto‘g‘ri variant: quyidagilardan biri kutilgan ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`Juda katta: kutilgan ${t.origin??"qiymat"} ${r}${t.maximum.toString()} ${a.unit} ${a.verb}`:`Juda katta: kutilgan ${t.origin??"qiymat"} ${r}${t.maximum.toString()}`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`Juda kichik: kutilgan ${t.origin} ${r}${t.minimum.toString()} ${a.unit} ${a.verb}`:`Juda kichik: kutilgan ${t.origin} ${r}${t.minimum.toString()}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`Noto‘g‘ri satr: "${r.prefix}" bilan boshlanishi kerak`:r.format==="ends_with"?`Noto‘g‘ri satr: "${r.suffix}" bilan tugashi kerak`:r.format==="includes"?`Noto‘g‘ri satr: "${r.includes}" ni o‘z ichiga olishi kerak`:r.format==="regex"?`Noto‘g‘ri satr: ${r.pattern} shabloniga mos kelishi kerak`:`Noto‘g‘ri ${i[r.format]??t.format}`}case"not_multiple_of":return`Noto‘g‘ri raqam: ${t.divisor} ning karralisi bo‘lishi kerak`;case"unrecognized_keys":return`Noma’lum kalit${t.keys.length>1?"lar":""}: ${v(t.keys,", ")}`;case"invalid_key":return`${t.origin} dagi kalit noto‘g‘ri`;case"invalid_union":return"Noto‘g‘ri kirish";case"invalid_element":return`${t.origin} da noto‘g‘ri qiymat`;default:return"Noto‘g‘ri kirish"}}};function jp(){return{localeError:Vh()}}var Bh=()=>{let e={string:{unit:"ký tự",verb:"có"},file:{unit:"byte",verb:"có"},array:{unit:"phần tử",verb:"có"},set:{unit:"phần tử",verb:"có"},map:{unit:"phần tử",verb:"có"}};function n(t){return e[t]??null}let i={regex:"đầu vào",email:"địa chỉ email",url:"URL",emoji:"emoji",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"ngày giờ ISO",date:"ngày ISO",time:"giờ ISO",duration:"khoảng thời gian ISO",ipv4:"địa chỉ IPv4",ipv6:"địa chỉ IPv6",mac:"địa chỉ MAC",cidrv4:"dải IPv4",cidrv6:"dải IPv6",base64:"chuỗi mã hóa base64",base64url:"chuỗi mã hóa base64url",json_string:"chuỗi JSON",e164:"số E.164",credit_card:"số thẻ tín dụng",currency_code:"mã tiền tệ",iban:"IBAN",jwt:"JWT",template_literal:"đầu vào"},o={nan:"NaN",number:"số",array:"mảng"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`Đầu vào không hợp lệ: mong đợi instanceof ${t.expected}, nhận được ${c}`:`Đầu vào không hợp lệ: mong đợi ${r}, nhận được ${c}`}case"invalid_value":return t.values.length===1?`Đầu vào không hợp lệ: mong đợi ${b(t.values[0])}`:`Tùy chọn không hợp lệ: mong đợi một trong các giá trị ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`Quá lớn: mong đợi ${t.origin??"giá trị"} ${a.verb} ${r}${t.maximum.toString()} ${a.unit??"phần tử"}`:`Quá lớn: mong đợi ${t.origin??"giá trị"} ${r}${t.maximum.toString()}`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`Quá nhỏ: mong đợi ${t.origin} ${a.verb} ${r}${t.minimum.toString()} ${a.unit}`:`Quá nhỏ: mong đợi ${t.origin} ${r}${t.minimum.toString()}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`Chuỗi không hợp lệ: phải bắt đầu bằng "${r.prefix}"`:r.format==="ends_with"?`Chuỗi không hợp lệ: phải kết thúc bằng "${r.suffix}"`:r.format==="includes"?`Chuỗi không hợp lệ: phải bao gồm "${r.includes}"`:r.format==="regex"?`Chuỗi không hợp lệ: phải khớp với mẫu ${r.pattern}`:`${i[r.format]??t.format} không hợp lệ`}case"not_multiple_of":return`Số không hợp lệ: phải là bội số của ${t.divisor}`;case"unrecognized_keys":return`Khóa không được nhận dạng: ${v(t.keys,", ")}`;case"invalid_key":return`Khóa không hợp lệ trong ${t.origin}`;case"invalid_union":return"Đầu vào không hợp lệ";case"invalid_element":return`Giá trị không hợp lệ trong ${t.origin}`;default:return"Đầu vào không hợp lệ"}}};function Np(){return{localeError:Bh()}}var Mh=()=>{let e={string:{unit:"字符",verb:"包含"},file:{unit:"字节",verb:"包含"},array:{unit:"项",verb:"包含"},set:{unit:"项",verb:"包含"},map:{unit:"项",verb:"包含"}};function n(t){return e[t]??null}let i={regex:"输入",email:"电子邮件",url:"URL",emoji:"表情符号",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"ISO日期时间",date:"ISO日期",time:"ISO时间",duration:"ISO时长",ipv4:"IPv4地址",ipv6:"IPv6地址",mac:"MAC地址",cidrv4:"IPv4网段",cidrv6:"IPv6网段",base64:"base64编码字符串",base64url:"base64url编码字符串",json_string:"JSON字符串",e164:"E.164号码",credit_card:"信用卡号",currency_code:"货币代码",iban:"IBAN",jwt:"JWT",template_literal:"输入"},o={nan:"NaN",number:"数字",array:"数组",null:"空值(null)"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`无效输入：期望 instanceof ${t.expected}，实际接收 ${c}`:`无效输入：期望 ${r}，实际接收 ${c}`}case"invalid_value":return t.values.length===1?`无效输入：期望 ${b(t.values[0])}`:`无效选项：期望以下之一 ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`数值过大：期望 ${t.origin??"值"} ${r}${t.maximum.toString()} ${a.unit??"个元素"}`:`数值过大：期望 ${t.origin??"值"} ${r}${t.maximum.toString()}`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`数值过小：期望 ${t.origin} ${r}${t.minimum.toString()} ${a.unit}`:`数值过小：期望 ${t.origin} ${r}${t.minimum.toString()}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`无效字符串：必须以 "${r.prefix}" 开头`:r.format==="ends_with"?`无效字符串：必须以 "${r.suffix}" 结尾`:r.format==="includes"?`无效字符串：必须包含 "${r.includes}"`:r.format==="regex"?`无效字符串：必须满足正则表达式 ${r.pattern}`:`无效${i[r.format]??t.format}`}case"not_multiple_of":return`无效数字：必须是 ${t.divisor} 的倍数`;case"unrecognized_keys":return`出现未知的键(key): ${v(t.keys,", ")}`;case"invalid_key":return`${t.origin} 中的键(key)无效`;case"invalid_union":return"无效输入";case"invalid_element":return`${t.origin} 中包含无效值(value)`;default:return"无效输入"}}};function Ep(){return{localeError:Mh()}}var Fh=()=>{let e={string:{unit:"字元",verb:"擁有"},file:{unit:"位元組",verb:"擁有"},array:{unit:"項目",verb:"擁有"},set:{unit:"項目",verb:"擁有"},map:{unit:"項目",verb:"擁有"}};function n(t){return e[t]??null}let i={regex:"輸入",email:"郵件地址",url:"URL",emoji:"emoji",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"ISO 日期時間",date:"ISO 日期",time:"ISO 時間",duration:"ISO 期間",ipv4:"IPv4 位址",ipv6:"IPv6 位址",mac:"MAC 位址",cidrv4:"IPv4 範圍",cidrv6:"IPv6 範圍",base64:"base64 編碼字串",base64url:"base64url 編碼字串",json_string:"JSON 字串",e164:"E.164 數值",credit_card:"信用卡號",currency_code:"貨幣代碼",iban:"IBAN",jwt:"JWT",template_literal:"輸入"},o={nan:"NaN"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`無效的輸入值：預期為 instanceof ${t.expected}，但收到 ${c}`:`無效的輸入值：預期為 ${r}，但收到 ${c}`}case"invalid_value":return t.values.length===1?`無效的輸入值：預期為 ${b(t.values[0])}`:`無效的選項：預期為以下其中之一 ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`數值過大：預期 ${t.origin??"值"} 應為 ${r}${t.maximum.toString()} ${a.unit??"個元素"}`:`數值過大：預期 ${t.origin??"值"} 應為 ${r}${t.maximum.toString()}`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`數值過小：預期 ${t.origin} 應為 ${r}${t.minimum.toString()} ${a.unit}`:`數值過小：預期 ${t.origin} 應為 ${r}${t.minimum.toString()}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`無效的字串：必須以 "${r.prefix}" 開頭`:r.format==="ends_with"?`無效的字串：必須以 "${r.suffix}" 結尾`:r.format==="includes"?`無效的字串：必須包含 "${r.includes}"`:r.format==="regex"?`無效的字串：必須符合格式 ${r.pattern}`:`無效的 ${i[r.format]??t.format}`}case"not_multiple_of":return`無效的數字：必須為 ${t.divisor} 的倍數`;case"unrecognized_keys":return`無法識別的鍵值${t.keys.length>1?"們":""}：${v(t.keys,"、")}`;case"invalid_key":return`${t.origin} 中有無效的鍵值`;case"invalid_union":return"無效的輸入值";case"invalid_element":return`${t.origin} 中有無效的值`;default:return"無效的輸入值"}}};function Dp(){return{localeError:Fh()}}var Jh=()=>{let e={string:{unit:"àmi",verb:"ní"},file:{unit:"bytes",verb:"ní"},array:{unit:"nkan",verb:"ní"},set:{unit:"nkan",verb:"ní"},map:{unit:"nkan",verb:"ní"}};function n(t){return e[t]??null}let i={regex:"ẹ̀rọ ìbáwọlé",email:"àdírẹ́sì ìmẹ́lì",url:"URL",emoji:"emoji",uuid:"UUID",uuidv4:"UUIDv4",uuidv6:"UUIDv6",nanoid:"nanoid",guid:"GUID",cuid:"cuid",cuid2:"cuid2",ulid:"ULID",xid:"XID",ksuid:"KSUID",datetime:"àkókò ISO",date:"ọjọ́ ISO",time:"àkókò ISO",duration:"àkókò tó pé ISO",ipv4:"àdírẹ́sì IPv4",ipv6:"àdírẹ́sì IPv6",mac:"àdírẹ́sì MAC",cidrv4:"àgbègbè IPv4",cidrv6:"àgbègbè IPv6",base64:"ọ̀rọ̀ tí a kọ́ ní base64",base64url:"ọ̀rọ̀ base64url",json_string:"ọ̀rọ̀ JSON",e164:"nọ́mbà E.164",credit_card:"nọmba kaadi gbese",currency_code:"koodu owó",iban:"IBAN",jwt:"JWT",template_literal:"ẹ̀rọ ìbáwọlé"},o={nan:"NaN",number:"nọ́mbà",array:"akopọ"};return t=>{switch(t.code){case"invalid_type":{let r=o[t.expected]??t.expected,a=$(t.input),c=o[a]??a;return/^[A-Z]/.test(t.expected)?`Ìbáwọlé aṣìṣe: a ní láti fi instanceof ${t.expected}, àmọ̀ a rí ${c}`:`Ìbáwọlé aṣìṣe: a ní láti fi ${r}, àmọ̀ a rí ${c}`}case"invalid_value":return t.values.length===1?`Ìbáwọlé aṣìṣe: a ní láti fi ${b(t.values[0])}`:`Àṣàyàn aṣìṣe: yan ọ̀kan lára ${v(t.values,"|")}`;case"too_big":{let r=t.inclusive?"<=":"<",a=n(t.origin);return a?`Tó pọ̀ jù: a ní láti jẹ́ pé ${t.origin??"iye"} ${a.verb} ${r}${t.maximum} ${a.unit}`:`Tó pọ̀ jù: a ní láti jẹ́ ${r}${t.maximum}`}case"too_small":{let r=t.inclusive?">=":">",a=n(t.origin);return a?`Kéré ju: a ní láti jẹ́ pé ${t.origin} ${a.verb} ${r}${t.minimum} ${a.unit}`:`Kéré ju: a ní láti jẹ́ ${r}${t.minimum}`}case"invalid_format":{let r=t;return r.format==="starts_with"?`Ọ̀rọ̀ aṣìṣe: gbọ́dọ̀ bẹ̀rẹ̀ pẹ̀lú "${r.prefix}"`:r.format==="ends_with"?`Ọ̀rọ̀ aṣìṣe: gbọ́dọ̀ parí pẹ̀lú "${r.suffix}"`:r.format==="includes"?`Ọ̀rọ̀ aṣìṣe: gbọ́dọ̀ ní "${r.includes}"`:r.format==="regex"?`Ọ̀rọ̀ aṣìṣe: gbọ́dọ̀ bá àpẹẹrẹ mu ${r.pattern}`:`Aṣìṣe: ${i[r.format]??t.format}`}case"not_multiple_of":return`Nọ́mbà aṣìṣe: gbọ́dọ̀ jẹ́ èyà pípín ti ${t.divisor}`;case"unrecognized_keys":return`Bọtìnì àìmọ̀: ${v(t.keys,", ")}`;case"invalid_key":return`Bọtìnì aṣìṣe nínú ${t.origin}`;case"invalid_union":return"Ìbáwọlé aṣìṣe";case"invalid_element":return`Iye aṣìṣe nínú ${t.origin}`;default:return"Ìbáwọlé aṣìṣe"}}};function Tp(){return{localeError:Jh()}}var Ap,Mc=Symbol("ZodOutput"),Fc=Symbol("ZodInput"),Fr=class{constructor(){this._map=new WeakMap,this._idmap=new Map}add(n,...i){let o=i[0];return this._map.set(n,o),o&&typeof o=="object"&&"id"in o&&this._idmap.set(o.id,n),this}clear(){return this._map=new WeakMap,this._idmap=new Map,this}remove(n){let i=this._map.get(n);return i&&typeof i=="object"&&"id"in i&&this._idmap.delete(i.id),this._map.delete(n),this}get(n){let i=n._zod.parent;if(i){let o={...this.get(i)??{}};delete o.id;let t={...o,...this._map.get(n)};return Object.keys(t).length?t:void 0}return this._map.get(n)}has(n){return this._map.has(n)}};function Jr(){return new Fr}(Ap=globalThis).__zod_globalRegistry??(Ap.__zod_globalRegistry=Jr());var X=globalThis.__zod_globalRegistry;var ee=Symbol.for("zod.compile.invalid"),Up=Symbol.for("zod.compile.fallback"),me=class extends Error{constructor(n="z.compile does not support async refinements, transforms, or checks"){super(n),this.name="ZodCompileAsyncError"}},D=class extends Error{constructor(n,i=!0){super(`z.compile does not support ${n}; this schema must use the runtime parser`),this.name="ZodCompileUnsupportedError",this.islandable=i}};function Wh(e,n){try{return Wr(e,{assertOnly:!0})}catch{return n}}function Gc(e,n){try{let i=Wr(e),o=Kr(e,i);return o._zod.bag.validator=Wh(e,i),o}catch(i){if(n?.strict)throw i;return e}}function Kr(e,n){if(Zr(e))throw new D("a schema whose subtree contains a reference cycle");let i=U(e),o=e._zod.run,t=o.__originalRun??o,r=(a,c)=>{if(c?.async||c?.direction==="backward"||c?.skipChecks||c?.[Up]||c&&Rr(c,a.value))return t(a,c);let u=n(a.value);return u!==ee?(a.value=u,a):(c&&(c[Up]=!0),t(a,c))};return r.__originalRun=t,i._zod.bag.fallbackRun=t,i._zod.bag.validator=n,i._zod.run=r,o.__originalRun||Gh(i,e,n),i}function Gh(e,n,i){let o=e,t=n;if(typeof t.safeParse=="function"){let r=t.safeParse;o.safeParse=(a,c)=>{let u=i(a);return u!==ee?{success:!0,data:u}:r(a,c)}}if(typeof t.parse=="function"){let r=t.parse;o.parse=(a,c)=>{let u=i(a);return u!==ee?u:r(a,c)}}}function Wr(e,n){let i=!0;try{i=Zr(e)}catch{}if(i)throw new D("a schema whose subtree contains a reference cycle");let o={constants:new Map,constantCounter:0,varCounter:0,definite:!0},t=new Je(["input"]),r=B(t,o,e,"input",!n?.assertOnly);t.write(r===null?"return true;":`return ${r};`);let a=["INVALID",...o.constants.keys()],c=[ee,...o.constants.values()],u=t.content.join(`
`),s=n?.debug?a.length>0?`// Constants: ${a.join(", ")}
${u}`:u:"",l=Function,p=`return (input) => {
${u}
}`,f;try{f=new l(...a,p)(...c)}catch(m){throw new D(`this schema (generated code failed to evaluate: ${m.message})`)}return n?.debug&&(f.code=s),f.definite=o.definite,f}function P(e,n){for(let[o,t]of e.constants)if(t===n)return o;let i=`c${e.constantCounter++}`;return e.constants.set(i,n),i}function Xe(e,n){return e.definite=!1,P(e,n)}function S(e){return`v${e.varCounter++}`}function Xh(e,n){let i=e._zod.run({value:n,issues:[]},{});if(i&&typeof i.then=="function")return ee;let o=i;return o.issues.length===0?o.value:ee}function H(e,n,i,o,t=!0){let r=e.content.length,a=n.constants.size,c=n.constantCounter,u=n.varCounter;try{return B(e,n,i,o,t)}catch(s){if(!(s instanceof D)||!s.islandable)throw s;if(e.content.length=r,n.constants.size>a){let l=Array.from(n.constants.keys()).slice(a);for(let p of l)n.constants.delete(p)}return n.constantCounter=c,n.varCounter=u,qh(e,n,i,o)}}function qh(e,n,i,o){n.definite=!1;let t=P(n,i),r=P(n,Xh),a=S(n);return e.write(`const ${a} = ${r}(${t}, ${o});`),e.write(`if (${a} === INVALID) return INVALID;`),a}var Hh=new Set(["max_size","min_size","size_equals","max_length","min_length","length_equals"]);function Yh(e,n,i,o){let t=i._zod.def.checks;if(!t||t.length===0)return o;let r=o;for(let a of t){let c=a._zod.def;if(c.when&&!Hh.has(c.check))throw new D('check with a custom "when" condition');switch(c.check){case"greater_than":Qh(e,n,c,r);break;case"less_than":ey(e,n,c,r);break;case"multiple_of":ty(e,n,c,r);break;case"number_format":Bp(e,c,r);break;case"min_length":{let u=We(c.minimum,"min_length"),s=Jc(e,n,r,`${r}.length >= ${u} && ${r}.length < ${c.minimum*2}`);e.write(`if (${s} < ${u}) return INVALID;`);break}case"max_length":{let u=We(c.maximum,"max_length"),s=Jc(e,n,r,`${r}.length > ${u}`);e.write(`if (${s} > ${u}) return INVALID;`);break}case"length_equals":{let u=We(c.length,"length_equals"),s=Jc(e,n,r,`${r}.length >= ${u} && ${r}.length <= ${c.length*2}`);e.write(`if (${s} !== ${u}) return INVALID;`);break}case"min_size":e.write(`if (${r}.size < ${We(c.minimum,"min_size")}) return INVALID;`);break;case"max_size":e.write(`if (${r}.size > ${We(c.maximum,"max_size")}) return INVALID;`);break;case"size_equals":e.write(`if (${r}.size !== ${We(c.size,"size_equals")}) return INVALID;`);break;case"string_format":r=Mp(e,n,c,r);break;case"custom":r=cy(e,n,a,r);break;case"bigint_format":ny(e,c,r);break;case"mime_type":ry(e,n,c,r);break;case"property":oy(e,n,c,r);break;case"properties":iy(e,n,c,r);break;case"overwrite":{let u=S(n);ay(e,n,a,r,u),r=u;break}default:throw new D(`check type ${c.check}`)}}return r}function Jc(e,n,i,o){let t=P(n,Me),r=S(n);return e.write(`const ${r} = typeof ${i} === "string" && ${o} ? ${t}(${i}) : ${i}.length;`),r}function We(e,n){if(typeof e!="number"||!Number.isFinite(e))throw new D(`${n} bound of type ${typeof e}`);return`${e}`}function Vp(e,n){if(typeof n=="bigint")return`${n}n`;if(typeof n=="number"){if(Number.isNaN(n))throw new D("comparison check with NaN bound");return`${n}`}if(n instanceof Date){if(Number.isNaN(n.getTime()))throw new D("comparison check with Invalid Date bound");return P(e,n)}throw new D(`comparison check bound of type ${typeof n}`)}function Qh(e,n,i,o){let t=i.inclusive?"<":"<=";e.write(`if (${o} ${t} ${Vp(n,i.value)}) return INVALID;`)}function ey(e,n,i,o){let t=i.inclusive?">":">=";e.write(`if (${o} ${t} ${Vp(n,i.value)}) return INVALID;`)}function ty(e,n,i,o){if(typeof i.value=="bigint"){if(i.value===BigInt(0))throw new D("multiple_of check with a zero divisor");e.write(`if (${o} % ${i.value}n !== 0n) return INVALID;`)}else{let t=P(n,Gt);e.write(`if (${t}(${o}, ${We(i.value,"multiple_of")}) !== 0) return INVALID;`)}}function Bp(e,n,i){let o=n.format;switch(o){case"safeint":e.write(`if (!Number.isSafeInteger(${i})) return INVALID;`);break;case"int32":e.write(`if (!Number.isInteger(${i}) || ${i} < -2147483648 || ${i} > 2147483647) return INVALID;`);break;case"uint32":e.write(`if (!Number.isInteger(${i}) || ${i} < 0 || ${i} > 4294967295) return INVALID;`);break;case"float32":e.write(`if (!Number.isFinite(${i}) || ${i} < -3.4028234663852886e38 || ${i} > 3.4028234663852886e38) return INVALID;`);break;case"float64":e.write(`if (!Number.isFinite(${i})) return INVALID;`);break;default:throw new D(`number format ${o}`)}}function ny(e,n,i){let o=n.format;if(o)switch(o){case"int64":e.write(`if (${i} < -9223372036854775808n || ${i} > 9223372036854775807n) return INVALID;`);break;case"uint64":e.write(`if (${i} < 0n || ${i} > 18446744073709551615n) return INVALID;`);break;default:throw new D(`bigint format ${o}`)}}function ry(e,n,i,o){let t=i.mime;if(t&&t.length>0){let r=P(n,new Set(t));e.write(`if (!${r}.has(${o}.type)) return INVALID;`)}}function iy(e,n,i,o){if(i.when)throw new D('check with a custom "when" condition');e.write(`if (${o} == null) return INVALID;`);let t=i.shape;for(let r of Reflect.ownKeys(t)){let a=typeof r=="symbol"?P(n,r):Y(r),c=S(n);e.write(`const ${c} = ${o}[${a}];`),H(e,n,t[r],c,!1)}}function oy(e,n,i,o){let t=`${o}[${JSON.stringify(i.property)}]`;B(e,n,i.schema,t)}function ay(e,n,i,o,t){let r=i._zod.def.tx;if(!r)throw new D("overwrite check without a transform function");if(qe(r))throw new me("z.compile: async overwrite transforms are not supported");let a=P(n,r);e.write(`const ${t} = ${a}(${o});`)}function Kc(){throw new oe}function Xc(e){this.issues.push(e)}function cy(e,n,i,o){let t=i._zod.def;if(t.fn){if(qe(t.fn))throw new me("z.compile: async .refine() predicates are not supported");let r=Xe(n,t.fn),a=P(n,Kc),c=S(n);return e.write(`const ${c} = ${r}(${o});`),e.write(`if (${c} instanceof Promise) ${a}();`),e.write(`if (!${c}) return INVALID;`),o}if(i._zod.check){if(qe(i._zod.check))throw new me("z.compile: async .superRefine() / check functions are not supported");let r=i._zod.check,c=Xe(n,s=>{let l={value:s,issues:[],addIssue:Xc};return r(l)instanceof Promise&&Kc(),l.issues.length===0?l.value:ee}),u=S(n);return e.write(`const ${u} = ${c}(${o});`),e.write(`if (${u} === INVALID) return INVALID;`),u}throw new D("custom check without a predicate or check function")}var uy=new Set(["cidrv4","cuid","cuid2","date","datetime","duration","e164","email","emoji","ends_with","guid","includes","ipv4","ksuid","lowercase","mac","nanoid","regex","starts_with","time","ulid","uppercase","uuid","xid"]);function Mp(e,n,i,o,t=!0){let r=i.format;if(r==="base64"){let s=P(n,mn);return e.write(`if (!${s}(${o})) return INVALID;`),o}if(r==="base64url"){let s=P(n,Sr);return e.write(`if (!${s}(${o})) return INVALID;`),o}if(r==="jwt"){let s=P(n,Or),l=P(n,i.alg??null);return e.write(`if (!${s}(${o}, ${l})) return INVALID;`),o}if(r==="ipv6"){let s=P(n,fn);return e.write(`if (!${s}(${o})) return INVALID;`),o}if(r==="cidrv6"){let s=P(n,wr);return e.write(`if (!${s}(${o})) return INVALID;`),o}if(r==="credit_card"){let s=P(n,zr);return e.write(`if (!${s}(${o})) return INVALID;`),o}if(r==="iban"){let s=P(n,Pr);return e.write(`if (!${s}(${o})) return INVALID;`),o}let a=i;if(r==="url"||r==="httpurl"||a.normalize||a.hostname!==void 0||a.protocol!==void 0){let s=P(n,_r),l=P(n,i),p=S(n),f=S(n);if(e.write(`const ${p} = ${o}.trim();`),e.write(`const ${f} = ${s}(${p}, ${l});`),e.write(`if (typeof ${f} === "number") return INVALID;`),a.hostname!==void 0){let _=P(n,kr);e.write(`if (!${_}(${f}, ${l}.hostname)) return INVALID;`)}if(a.protocol!==void 0){let _=P(n,xr);e.write(`if (!${_}(${f}, ${l}.protocol)) return INVALID;`)}if(!t)return null;let m=S(n),h=a.normalize?`${f}.href`:`${P(n,pn)}(${p})`;return e.write(`const ${m} = ${h};`),m}let c=i.fn;if(c){if(qe(c))throw new D(`async string format ${r}`);let s=P(n,c);return e.write(`if (!${s}(${o})) return INVALID;`),o}if(uy.has(r)&&i.pattern){let s=P(n,i.pattern);return e.write(`${s}.lastIndex = 0;`),e.write(`if (!${s}.test(${o})) return INVALID;`),o}let u=i.format;switch(u){case"regex":throw new D("regex format without a pattern");case"lowercase":e.write(`if (${o} !== ${o}.toLowerCase()) return INVALID;`);break;case"uppercase":e.write(`if (${o} !== ${o}.toUpperCase()) return INVALID;`);break;case"includes":e.write(`if (!${o}.includes(${Y(i.includes)})) return INVALID;`);break;case"starts_with":{let s=i.prefix;e.write(`if (${o}.slice(0, ${s.length}) !== ${Y(s)}) return INVALID;`);break}case"ends_with":{let s=i.suffix;e.write(`if (${o}.slice(-${s.length}) !== ${Y(s)}) return INVALID;`);break}default:throw new D(`string format ${u}`)}return o}function B(e,n,i,o,t=!0){let r=i._zod.def,a=r.type;if(r.coerce)throw new D(`coercion (z.coerce.${a}())`);let c=t||!!r.checks?.length,u;switch(a){case"string":u=sy(e,n,i,o,c);break;case"number":u=ly(e,i,o);break;case"boolean":u=dy(e,o);break;case"bigint":u=py(e,i,o);break;case"symbol":u=fy(e,o);break;case"undefined":u=my(e,o);break;case"null":u=gy(e,o);break;case"any":case"unknown":u=o;break;case"never":e.write("return INVALID;"),u=o;break;case"void":u=vy(e,o);break;case"nan":u=hy(e,o);break;case"date":u=yy(e,o);break;case"object":u=by(e,n,i,o,c);break;case"optional":u=$y(e,n,i,o,c);break;case"nullable":u=xy(e,n,i,o,c);break;case"array":u=wy(e,n,i,o,c);break;case"literal":u=Iy(e,n,i,o);break;case"enum":u=Sy(e,n,i,o);break;case"readonly":{let s=Cp(e,n,i,o),l=S(n);e.write(`const ${l} = Object.freeze(${s});`),u=l;break}case"success":Cp(e,n,i,o),u="true";break;case"default":case"prefault":u=zy(e,n,i,o);break;case"nonoptional":u=Py(e,n,i,o);break;case"tuple":u=Oy(e,n,i,o);break;case"union":u=jy(e,n,i,o);break;case"intersection":u=Dy(e,n,i,o);break;case"record":u=Ty(e,n,i,o);break;case"map":u=Uy(e,n,i,o);break;case"set":u=Ly(e,n,i,o);break;case"file":u=Cy(e,o);break;case"template_literal":u=Zy(e,n,i,o);break;case"lazy":u=Ry(e,n,i,o);break;case"pipe":u=Vy(e,n,i,o);break;case"custom":u=By(e,n,i,o);break;case"transform":u=Jy(e,n,i,o);break;case"catch":u=Fy(e,n,i,o);break;default:throw new D(`schema type ${a}`)}return u===null?null:Yh(e,n,i,u)}function sy(e,n,i,o,t=!0){e.write(`if (typeof ${o} !== "string") return INVALID;`);let r=i._zod.def;return r.format===void 0?o:Mp(e,n,r,o,t)}function ly(e,n,i){e.write(`if (typeof ${i} !== "number" || !Number.isFinite(${i})) return INVALID;`);let o=n._zod.def;return o.check==="number_format"&&o.format&&Bp(e,{format:o.format},i),i}function dy(e,n){return e.write(`if (typeof ${n} !== "boolean") return INVALID;`),n}function py(e,n,i){e.write(`if (typeof ${i} !== "bigint") return INVALID;`);let o=n._zod.def;if(o.format)switch(o.format){case"int64":e.write(`if (${i} < -9223372036854775808n || ${i} > 9223372036854775807n) return INVALID;`);break;case"uint64":e.write(`if (${i} < 0n || ${i} > 18446744073709551615n) return INVALID;`);break}return i}function fy(e,n){return e.write(`if (typeof ${n} !== "symbol") return INVALID;`),n}function my(e,n){return e.write(`if (${n} !== undefined) return INVALID;`),n}function gy(e,n){return e.write(`if (${n} !== null) return INVALID;`),n}function vy(e,n){return e.write(`if (${n} !== undefined) return INVALID;`),n}function hy(e,n){return e.write(`if (typeof ${n} !== "number" || !Number.isNaN(${n})) return INVALID;`),n}function yy(e,n){return e.write(`if (!(${n} instanceof Date) || Number.isNaN(${n}.getTime())) return INVALID;`),n}function by(e,n,i,o,t=!0){let r=i._zod.def;e.write(`if (typeof ${o} !== "object" || ${o} === null || Array.isArray(${o})) return INVALID;`);let a=r.shape,c=Object.keys(a),u=Object.getOwnPropertySymbols(a),s=u.length?[...c,...u]:c,l=I=>typeof I=="symbol"?P(n,I):Y(I),p=I=>typeof I=="symbol"?`[${l(I)}]`:Y(I),f=a;if(c.includes("__proto__"))throw new D('object shape key "__proto__"');let m=new Map;for(let I of s){let j=f[I],A=l(I),V=S(n);if(e.write(`const ${V} = ${o}[${A}];`),j._zod.optin!==void 0){let T=S(n);e.write(`let ${T} = (() => {`),e.indented(q=>{let Kt=H(q,n,j,V);q.write(`return ${Kt};`)}),e.write("})();"),j._zod.optout==="optional"?(e.write(`if (${T} === INVALID) {`),e.indented(q=>{q.write(`if (${A} in ${o}) return INVALID;`),q.write(`${T} = undefined;`)}),e.write("}")):e.write(`if (${T} === INVALID) return INVALID;`),m.set(I,T)}else{ky(j)&&e.write(`if (!(${A} in ${o})) return INVALID;`);let T=H(e,n,j,V,t);T!==null&&m.set(I,T)}}let h=r.catchall,_="none";if(h){let I=h._zod.def.type;if(I==="never"){let j=c.map(A=>`k !== ${Y(A)}`).join(" && ")||"true";e.write(`for (const k in ${o}) {`),e.indented(A=>{A.write(`if (${j}) return INVALID;`)}),e.write("}")}else(I==="unknown"||I==="any")&&!h._zod.def.checks?.length?_="passthrough":_="schema"}let x=S(n),z=s.some(I=>Lp(f[I])||Wc(f[I]));if(!t){if(_==="schema"){let I=c.length>0?P(n,new Set(c)):null;e.write(`for (const k in ${o}) {`),e.indented(j=>{j.write('if (k === "__proto__") continue;'),I&&j.write(`if (${I}.has(k)) continue;`);let A=S(n);j.write(`const ${A} = ${o}[k];`),H(j,n,h,A,!1)}),e.write("}")}return null}if(z){e.write(`const ${x} = {};`);for(let I of s){let j=l(I),A=m.get(I);Wc(f[I])?e.write(`if (${j} in ${o}) ${x}[${j}] = ${A};`):Lp(f[I])?e.write(`if (${A} !== undefined || ${j} in ${o}) ${x}[${j}] = ${A};`):e.write(`${x}[${j}] = ${A};`)}}else{let I=s.map(j=>`${p(j)}: ${m.get(j)}`).join(", ");e.write(`const ${x} = { ${I} };`)}if(_!=="none"){let I=c.length>0?P(n,new Set(c)):null;e.write(`for (const k in ${o}) {`),e.indented(j=>{if(j.write('if (k === "__proto__") continue;'),I&&j.write(`if (${I}.has(k)) continue;`),_==="passthrough")j.write(`${x}[k] = ${o}[k];`);else{let A=S(n);j.write(`const ${A} = ${o}[k];`);let V=H(j,n,h,A);j.write(`${x}[k] = ${V};`)}}),e.write("}")}return x}function $y(e,n,i,o,t=!0){let r=i._zod.def;if(_y(i))return B(e,n,r.innerType,o,t);if(r.innerType._zod.optin==="defaulted"){let c=S(n),u=S(n);return e.write(`let ${c};`),e.write(`if (${o} === undefined) {`),e.indented(s=>{s.write(`const ${u} = (() => {`),s.indented(l=>{let p=B(l,n,r.innerType,o);l.write(`return ${p};`)}),s.write("})();"),s.write(`if (${u} !== INVALID) ${c} = ${u};`)}),e.write("} else {"),e.indented(s=>{let l=B(s,n,r.innerType,o);s.write(`${c} = ${l};`)}),e.write("}"),c}let a=t?S(n):null;return a&&e.write(`let ${a};`),e.write(`if (${o} !== undefined) {`),e.indented(c=>{let u=B(c,n,r.innerType,o,t);a&&u!==null&&c.write(`${a} = ${u};`)}),e.write("}"),a}function _y(e){return e._zod.traits?.has("$ZodExactOptional")===!0}function ky(e){return e._zod.optin===void 0&&Ge(e)}function Ge(e){if(e._zod.def.coerce)return!0;let n=e._zod.def;switch(n.type){case"any":case"unknown":case"undefined":case"void":case"default":case"prefault":case"transform":case"custom":case"lazy":return!0;case"string":case"number":case"boolean":case"bigint":case"symbol":case"null":case"never":case"nan":case"date":case"object":case"array":case"tuple":case"record":case"map":case"set":case"file":case"template_literal":return!1;case"nonoptional":return n.innerType?Ge(n.innerType):!1;case"literal":return!!n.values?.includes(void 0);case"enum":return!!e._zod.values?.has(void 0);case"optional":case"nullable":case"readonly":case"success":return n.innerType?Ge(n.innerType):!0;case"catch":return!0;case"union":return n.options?n.options.some(Ge):!0;case"intersection":return!n.left||!n.right?!0:Ge(n.left)&&Ge(n.right);case"pipe":return n.in?Ge(n.in):!0;default:return!0}}function Wc(e){return e._zod.optin==="optional"&&e._zod.optout==="optional"}function Lp(e){return(e._zod.optin!=="defaulted"||e._zod.optout==="optional")&&_t(e)}function _t(e){let n=e._zod.def;switch(n.type){case"string":case"number":case"boolean":case"bigint":case"symbol":case"null":case"nan":case"date":case"object":case"array":case"tuple":case"record":case"map":case"set":case"file":case"template_literal":case"never":case"success":return!1;case"literal":return!!n.values?.includes(void 0);case"enum":return!!e._zod.values?.has(void 0);case"optional":return!0;case"nullable":case"readonly":case"nonoptional":return n.innerType?_t(n.innerType):!0;case"union":return n.options?n.options.some(_t):!0;case"intersection":return!n.left||!n.right||_t(n.left)||_t(n.right);case"pipe":return n.out?_t(n.out):!0;default:return!0}}function xy(e,n,i,o,t=!0){let r=i._zod.def,a=t?S(n):null;return a&&e.write(`let ${a} = null;`),e.write(`if (${o} !== null) {`),e.indented(c=>{let u=B(c,n,r.innerType,o,t);a&&u!==null&&c.write(`${a} = ${u};`)}),e.write("}"),a}function wy(e,n,i,o,t=!0){let r=i._zod.def;e.write(`if (!Array.isArray(${o})) return INVALID;`);let a=t?S(n):null,c=S(n),u=S(n);return a&&e.write(`const ${a} = new Array(${o}.length);`),e.write(`for (let ${c} = 0; ${c} < ${o}.length; ${c}++) {`),e.indented(s=>{s.write(`const ${u} = ${o}[${c}];`);let l=H(s,n,r.element,u,t);a&&l!==null&&s.write(`${a}[${c}] = ${l};`)}),e.write("}"),a}function Iy(e,n,i,o){let r=i._zod.def.values;if(r.length!==1){let c=P(n,new Set(r));return e.write(`if (!${c}.has(${o})) return INVALID;`),o}let a=r[0];if(typeof a=="number"&&Number.isNaN(a)){let c=P(n,new Set(r));return e.write(`if (!${c}.has(${o})) return INVALID;`),o}if(typeof a=="string")e.write(`if (${o} !== ${Y(a)}) return INVALID;`);else if(typeof a=="number"||typeof a=="boolean")e.write(`if (${o} !== ${a}) return INVALID;`);else if(a===null)e.write(`if (${o} !== null) return INVALID;`);else if(a===void 0)e.write(`if (${o} !== undefined) return INVALID;`);else if(typeof a=="bigint")e.write(`if (${o} !== ${a}n) return INVALID;`);else throw new D(`literal type ${typeof a}`);return o}function Sy(e,n,i,o){let t=i._zod.values;if(!t)throw new D("enum schema without enumerated values");let r=P(n,t);return e.write(`if (!${r}.has(${o})) return INVALID;`),o}function Cp(e,n,i,o){let t=i._zod.def;return B(e,n,t.innerType,o)}function zy(e,n,i,o){let t=i._zod.def,a=Object.getOwnPropertyDescriptor(i._zod.def,"defaultValue")?()=>i._zod.def.defaultValue:void 0;if(i._zod.def.type==="prefault"){if(!a)return B(e,n,t.innerType,o);let u=P(n,a),s=S(n);return e.write(`let ${s} = ${o};`),e.write(`if (${o} === undefined) ${s} = ${u}();`),B(e,n,t.innerType,s)}let c=S(n);if(a){let u=P(n,a),s=P(n,Xt);e.write(`let ${c};`),e.write(`if (${o} === undefined) {`),e.indented(l=>{l.write(`${c} = ${s}(${u}());`)}),e.write("} else {"),e.indented(l=>{let p=B(l,n,t.innerType,o);l.write(`${c} = ${p} === undefined ? ${s}(${u}()) : ${p};`)}),e.write("}")}else e.write(`let ${c};`),e.write(`if (${o} !== undefined) {`),e.indented(u=>{let s=B(u,n,t.innerType,o);u.write(`${c} = ${s};`)}),e.write("}");return c}function Py(e,n,i,o){let t=i._zod.def,r=B(e,n,t.innerType,o),a=S(n);return e.write(`const ${a} = ${r};`),e.write(`if (${a} === undefined) return INVALID;`),a}function Oy(e,n,i,o){let t=i._zod.def,r=t.items,a=t.rest;e.write(`if (!Array.isArray(${o})) return INVALID;`);let c=Zp(r,"optin"),u=Zp(r,"optout");a?e.write(`if (${o}.length < ${c}) return INVALID;`):e.write(`if (${o}.length < ${c} || ${o}.length > ${r.length}) return INVALID;`);let s=S(n);e.write(`const ${s} = [];`);for(let l=0;l<r.length;l++){let p=r[l];if(l>=u)e.write(`if (${s}.length === ${l}) {`),e.indented(f=>{f.write(`if (${l} < ${o}.length) {`),f.indented(m=>{let h=S(n);m.write(`const ${h} = ${o}[${l}];`);let _=H(m,n,p,h);m.write(`${s}[${l}] = ${_};`)}),f.write("} else {"),f.indented(m=>{if(Wc(p)){m.write(`${s}.length = ${l};`);return}let h=S(n),_=S(n);m.write(`const ${h} = undefined;`),m.write(`const ${_} = (() => {`),m.indented(x=>{let z=H(x,n,p,h);x.write(`return ${z};`)}),m.write("})();"),m.write(`if (${_} === INVALID || ${_} === undefined) ${s}.length = ${l};`),m.write(`else ${s}[${l}] = ${_};`)}),f.write("}")}),e.write("}");else{let f=S(n);e.write(`const ${f} = ${o}[${l}];`);let m=H(e,n,p,f);e.write(`${s}[${l}] = ${m};`)}}if(a){let l=S(n),p=S(n);e.write(`for (let ${l} = ${r.length}; ${l} < ${o}.length; ${l}++) {`),e.indented(f=>{f.write(`const ${p} = ${o}[${l}];`);let m=H(f,n,a,p);f.write(`${s}[${l}] = ${m};`)}),e.write("}")}return s}function Zp(e,n){for(let i=e.length-1;i>=0;i--)if(!(n==="optin"?e[i]._zod.optin!==void 0:e[i]._zod.optout==="optional"))return i+1;return 0}function jy(e,n,i,o){let t=i._zod.def,r=t.options;if(t.discriminator)return Ny(e,n,t,o);if(t.inclusive===!1)throw new D("exclusive unions (z.xor)");if(r.length===0)return e.write("return INVALID;"),o;if(r.length===1)return B(e,n,r[0],o);if(r.every(u=>u._zod.def.type==="literal"&&!u._zod.def.checks?.length)){let u=new Set(r.flatMap(l=>l._zod.def.values)),s=P(n,u);return e.write(`if (!${s}.has(${o})) return INVALID;`),o}let c=S(n);e.write(`let ${c};`);for(let u=0;u<r.length;u++){let s=r[u];u===0?e.write(`${c} = (() => {`):e.write(`if (${c} === INVALID) ${c} = (() => {`),e.indented(l=>{let p=B(l,n,s,o);l.write(`return ${p};`)}),e.write("})();")}return e.write(`if (${c} === INVALID) return INVALID;`),c}function Ny(e,n,i,o){if(i.unionFallback)throw new D("discriminated union with unionFallback");if(i.options.length===0)return e.write("return INVALID;"),o;let t=S(n),r=S(n);e.write(`const ${t} = ${o}?.[${Y(i.discriminator)}];`),e.write(`let ${r};`);let a=!0,c=new Set;for(let u of i.options){let s=u._zod.propValues?.[i.discriminator];if(!s||s.size===0)throw new D("discriminated union option without static discriminator values");for(let f of s){if(c.has(f))throw new D(`duplicate discriminator value ${String(f)}`);c.add(f)}let l=Array.from(s,f=>Ey(n,t,f)),p=a?"if":"else if";e.write(`${p} (${l.join(" || ")}) {`),e.indented(f=>{let m=B(f,n,u,o);f.write(`${r} = ${m};`)}),e.write("}"),a=!1}return e.write("else { return INVALID; }"),r}function Ey(e,n,i){if(typeof i=="string")return`${n} === ${Y(i)}`;if(typeof i=="number")return Number.isNaN(i)?`Number.isNaN(${n})`:`${n} === ${i}`;if(typeof i=="boolean")return`${n} === ${i}`;if(i===null)return`${n} === null`;if(i===void 0)return`${n} === undefined`;if(typeof i=="bigint")return`${n} === ${i}n`;if(typeof i=="symbol"){let o=P(e,i);return`${n} === ${o}`}throw new D(`literal discriminator value ${String(i)}`)}function Dy(e,n,i,o){let t=i._zod.def;n.definite=!1;let r=H(e,n,t.left,o),a=H(e,n,t.right,o),c=P(n,yt),u=S(n);return e.write(`const ${u} = ${c}(${r}, ${a});`),e.write(`if (!${u}.valid) return INVALID;`),`${u}.data`}function Ty(e,n,i,o){let t=i._zod.def,r=P(n,le);e.write(`if (!${r}(${o})) return INVALID;`);let a=S(n),c=S(n),u=S(n);e.write(`const ${a} = {};`);let s=t,l=s.partial?void 0:t.keyType._zod.values;if(l){let m=[];for(let _ of l){if(!(typeof _=="string"||typeof _=="number"||typeof _=="symbol"))throw new D(`record key value ${String(_)}`);let x=typeof _=="number"?_.toString():_;if(x==="__proto__")throw new D('record key "__proto__"');m.push(x);let z=P(n,_),I=B(e,n,t.keyType,z),j=S(n);e.write(`const ${j} = ${o}[${Ay(n,x)}];`);let A=H(e,n,t.valueType,j);e.write(`${a}[${I}] = ${A};`)}let h=P(n,new Set(m));return e.write(`for (const ${c} in ${o}) {`),e.indented(_=>{_.write(`if (${h}.has(${c})) continue;`),s.mode==="loose"?_.write(`if (${c} !== "__proto__") ${a}[${c}] = ${o}[${c}];`):_.write("return INVALID;")}),e.write("}"),a}let p=t.keyType._zod.def;if(!(p.type==="string"&&p.format===void 0&&!p.coerce&&(p.checks?.length??0)===0)){let m=t.mode==="loose",h=Wr(t.keyType);h.definite===!1&&(n.definite=!1);let _=P(n,h),x=P(n,we),z=S(n);return Rp(e,n,o,c,I=>{I.write(`let ${z} = ${_}(${c});`),I.write(`if (${z} === INVALID && typeof ${c} === "string" && ${x}.test(${c})) ${z} = ${_}(Number(${c}));`),m?I.write(`if (${z} === INVALID) { ${a}[${c}] = ${o}[${c}]; continue; }`):I.write(`if (${z} === INVALID) return INVALID;`),I.write(`if (${z} === "__proto__") continue;`);let j=S(n);I.write(`const ${j} = ${o}[${c}];`);let A=H(I,n,t.valueType,j);I.write(`${a}[${z}] = ${A};`)}),a}return Rp(e,n,o,c,m=>{m.write(`const ${u} = ${o}[${c}];`);let h=H(m,n,t.valueType,u);m.write(`${a}[${c}] = ${h};`)},"return INVALID;"),a}function Rp(e,n,i,o,t,r){let a=P(n,Object.prototype.propertyIsEnumerable),c=S(n),u=S(n),s=S(n);e.write(`const ${c} = Object.getOwnPropertySymbols(${i});`),e.write(`const ${u} = Object.getOwnPropertyNames(${i});`),e.write(`for (let ${s} = 0; ${s} < ${u}.length; ${s}++) {`),e.indented(l=>{l.write(`const ${o} = ${u}[${s}];`),l.write(`if (${o} === "__proto__" || !${a}.call(${i}, ${o})) continue;`),t(l)}),e.write("}"),e.write(`for (let ${s} = 0; ${s} < ${c}.length; ${s}++) {`),e.indented(l=>{l.write(`const ${o} = ${c}[${s}];`),l.write(`if (!${a}.call(${i}, ${o})) continue;`),r?l.write(r):t(l)}),e.write("}")}function Ay(e,n){return typeof n=="string"?Y(n):P(e,n)}function Uy(e,n,i,o){let t=i._zod.def;e.write(`if (!(${o} instanceof Map)) return INVALID;`);let r=S(n),a=S(n),c=S(n);return e.write(`const ${r} = new Map();`),e.write(`for (const [${a}, ${c}] of ${o}) {`),e.indented(u=>{let s=B(u,n,t.keyType,a),l=B(u,n,t.valueType,c);u.write(`${r}.set(${s}, ${l});`)}),e.write("}"),r}function Ly(e,n,i,o){let t=i._zod.def;e.write(`if (!(${o} instanceof Set)) return INVALID;`);let r=S(n),a=S(n);return e.write(`const ${r} = new Set();`),e.write(`for (const ${a} of ${o}) {`),e.indented(c=>{let u=B(c,n,t.valueType,a);c.write(`${r}.add(${u});`)}),e.write("}"),r}function Cy(e,n){return e.write(`if (!(${n} instanceof File)) return INVALID;`),n}function Zy(e,n,i,o){e.write(`if (typeof ${o} !== "string") return INVALID;`);let t=i._zod.pattern;if(t){let r=P(n,t);e.write(`${r}.lastIndex = 0;`),e.write(`if (!${r}.test(${o})) return INVALID;`)}return o}function Ry(e,n,i,o){let t=i._zod.def,r=Xe(n,t.getter),a=P(n,{parser:null});e.write(`if (!${a}.parser) {`),e.indented(u=>{u.write(`const inner = ${r}();`),u.write(`${a}.parser = function(input) {`),u.indented(s=>{s.write("const result = inner._zod.run({ value: input, issues: [] }, {});"),s.write("return result.issues.length === 0 ? result.value : INVALID;")}),u.write("};")}),e.write("}");let c=S(n);return e.write(`const ${c} = ${a}.parser(${o});`),e.write(`if (${c} === INVALID) return INVALID;`),c}function Vy(e,n,i,o){let t=i._zod.def,r=B(e,n,t.in,o);if(t.transform){if(qe(t.transform))throw new me("z.compile: async transforms in pipes are not supported");let a=t.transform,u=Xe(n,l=>{let p={value:l,issues:[],addIssue:Xc},f=a(l,p);return f instanceof Promise?ee:p.issues.length===0?f:ee}),s=S(n);return e.write(`const ${s} = ${u}(${r});`),e.write(`if (${s} === INVALID) return INVALID;`),B(e,n,t.out,s)}else return B(e,n,t.out,r)}function qe(e){return typeof e=="function"&&(e.constructor.name==="AsyncFunction"||e[Symbol.toStringTag]==="AsyncFunction")}function By(e,n,i,o){let t=i._zod.def;if(t.fn){if(qe(t.fn))throw new me("z.compile: async custom predicates are not supported");let r=Xe(n,t.fn),a=P(n,Kc),c=S(n);e.write(`const ${c} = ${r}(${o});`),e.write(`if (${c} instanceof Promise) ${a}();`),e.write(`if (!${c}) return INVALID;`)}else throw new D("custom schema without a predicate function");return o}function My(e,n,i){let o=e._zod.run({value:i,issues:[]},{});if(o&&typeof o.then=="function")return ee;let t=o;return t.issues.length===0?t.value:n()}function Fy(e,n,i,o){let t=i._zod.def;if(!t.catchValue[Yn])throw new D("catch with a callback (only a constant catch value compiles)",!1);let r=S(n);e.write(`let ${r} = (() => {`),e.indented(s=>{let l=H(s,n,t.innerType,o);s.write(`return ${l};`)}),e.write("})();");let a=P(n,t.innerType),c=Xe(n,t.catchValue),u=P(n,My);return e.write(`if (${r} === INVALID) {`),e.indented(s=>{s.write(`${r} = ${u}(${a}, ${c}, ${o});`),s.write(`if (${r} === INVALID) return INVALID;`)}),e.write("}"),r}function Jy(e,n,i,o){let t=i._zod.def;if(t.transform){if(qe(t.transform))throw new me("z.compile: async transforms are not supported");let r=t.transform,c=Xe(n,s=>{let l={value:s,issues:[],addIssue:Xc},p=r(s,l);return p instanceof Promise?ee:l.issues.length===0?p:ee}),u=S(n);return e.write(`const ${u} = ${c}(${o});`),e.write(`if (${u} === INVALID) return INVALID;`),u}return o}function Gr(e){return e.checks&&(e.checks=[...e.checks]),e}function qc(e,n){return new e(Gr({type:"string",...k(n)}))}function Hc(e,n){return new e(Gr({type:"string",coerce:!0,...k(n)}))}function Xr(e,n){return new e({type:"string",format:"email",check:"string_format",abort:!1,...k(n)})}function qr(e,n){return new e({type:"string",format:"guid",check:"string_format",abort:!1,...k(n)})}function Hr(e,n){return new e({type:"string",format:"uuid",check:"string_format",abort:!1,...k(n)})}function Yr(e,n){return new e({type:"string",format:"uuid",check:"string_format",abort:!1,version:"v4",...k(n)})}function Qr(e,n){return new e({type:"string",format:"uuid",check:"string_format",abort:!1,version:"v6",...k(n)})}function ei(e,n){return new e({type:"string",format:"uuid",check:"string_format",abort:!1,version:"v7",...k(n)})}function In(e,n){return new e({type:"string",format:"url",check:"string_format",abort:!1,...k(n)})}function ti(e,n){return new e({type:"string",format:"emoji",check:"string_format",abort:!1,...k(n)})}function ni(e,n){return new e({type:"string",format:"nanoid",check:"string_format",abort:!1,...k(n)})}function ri(e,n){return new e({type:"string",format:"cuid",check:"string_format",abort:!1,...k(n)})}function ii(e,n){return new e({type:"string",format:"cuid2",check:"string_format",abort:!1,...k(n)})}function oi(e,n){return new e({type:"string",format:"ulid",check:"string_format",abort:!1,...k(n)})}function ai(e,n){return new e({type:"string",format:"xid",check:"string_format",abort:!1,...k(n)})}function ci(e,n){return new e({type:"string",format:"ksuid",check:"string_format",abort:!1,...k(n)})}function ui(e,n){return new e({type:"string",format:"ipv4",check:"string_format",abort:!1,...k(n)})}function si(e,n){return new e({type:"string",format:"ipv6",check:"string_format",abort:!1,...k(n)})}function Yc(e,n){return new e({type:"string",format:"mac",check:"string_format",abort:!1,...k(n)})}function li(e,n){return new e({type:"string",format:"cidrv4",check:"string_format",abort:!1,...k(n)})}function di(e,n){return new e({type:"string",format:"cidrv6",check:"string_format",abort:!1,...k(n)})}function pi(e,n){return new e({type:"string",format:"base64",check:"string_format",abort:!1,...k(n)})}function fi(e,n){return new e({type:"string",format:"base64url",check:"string_format",abort:!1,...k(n)})}function mi(e,n){return new e({type:"string",format:"e164",check:"string_format",abort:!1,...k(n)})}function Qc(e,n){return new e({type:"string",format:"credit_card",check:"string_format",abort:!1,...k(n)})}function eu(e,n){return new e({type:"string",format:"iban",check:"string_format",abort:!1,...k(n)})}function gi(e,n){return new e({type:"string",format:"jwt",check:"string_format",abort:!1,...k(n)})}var tu={Any:null,Minute:-1,Second:0,Millisecond:3,Microsecond:6};function Sn(e,n){return new e({type:"string",format:"datetime",check:"string_format",offset:!1,local:!1,precision:null,...k(n)})}function zn(e,n){return new e({type:"string",format:"date",check:"string_format",...k(n)})}function Pn(e,n){return new e({type:"string",format:"time",check:"string_format",precision:null,...k(n)})}function On(e,n){return new e({type:"string",format:"duration",check:"string_format",...k(n)})}function nu(e,n){return new e(Gr({type:"number",checks:[],...k(n)}))}function ru(e,n){return new e(Gr({type:"number",coerce:!0,checks:[],...k(n)}))}function iu(e,n){return new e({type:"number",check:"number_format",abort:!1,format:"safeint",...k(n)})}function ou(e,n){return new e({type:"number",check:"number_format",abort:!1,format:"float32",...k(n)})}function au(e,n){return new e({type:"number",check:"number_format",abort:!1,format:"float64",...k(n)})}function cu(e,n){return new e({type:"number",check:"number_format",abort:!1,format:"int32",...k(n)})}function uu(e,n){return new e({type:"number",check:"number_format",abort:!1,format:"uint32",...k(n)})}function su(e,n){return new e({type:"boolean",...k(n)})}function lu(e,n){return new e({type:"boolean",coerce:!0,...k(n)})}function du(e,n){return new e({type:"bigint",...k(n)})}function pu(e,n){return new e({type:"bigint",coerce:!0,...k(n)})}function fu(e,n){return new e({type:"bigint",check:"bigint_format",abort:!1,format:"int64",...k(n)})}function mu(e,n){return new e({type:"bigint",check:"bigint_format",abort:!1,format:"uint64",...k(n)})}function gu(e,n){return new e({type:"symbol",...k(n)})}function vu(e,n){return new e({type:"undefined",...k(n)})}function hu(e,n){return new e({type:"null",...k(n)})}function yu(e){return new e({type:"any"})}function bu(e){return new e({type:"unknown"})}function $u(e,n){return new e({type:"never",...k(n)})}function _u(e,n){return new e({type:"void",...k(n)})}function ku(e,n){return new e({type:"date",...k(n)})}function xu(e,n){return new e({type:"date",coerce:!0,...k(n)})}function wu(e,n){return new e({type:"nan",...k(n)})}function he(e,n){return new mr({check:"less_than",...k(n),value:e,inclusive:!1})}function ue(e,n){return new mr({check:"less_than",...k(n),value:e,inclusive:!0})}function ye(e,n){return new gr({check:"greater_than",...k(n),value:e,inclusive:!1})}function se(e,n){return new gr({check:"greater_than",...k(n),value:e,inclusive:!0})}function vi(e){return ye(0,e)}function hi(e){return he(0,e)}function yi(e){return ue(0,e)}function bi(e){return se(0,e)}function Ne(e,n){return new ua({check:"multiple_of",...k(n),value:e})}function Ee(e,n){return new da({check:"max_size",...k(n),maximum:e})}function be(e,n){return new pa({check:"min_size",...k(n),minimum:e})}function He(e,n){return new fa({check:"size_equals",...k(n),size:e})}function Ye(e,n){return new ma({check:"max_length",...k(n),maximum:e})}function Ie(e,n){return new ga({check:"min_length",...k(n),minimum:e})}function Qe(e,n){return new va({check:"length_equals",...k(n),length:e})}function kt(e,n){return new ha({check:"string_format",format:"regex",...k(n),pattern:e})}function xt(e){return new ya({check:"string_format",format:"lowercase",...k(e)})}function wt(e){return new ba({check:"string_format",format:"uppercase",...k(e)})}function It(e,n){return new $a({check:"string_format",format:"includes",...k(n),includes:e})}function St(e,n){return new _a({check:"string_format",format:"starts_with",...k(n),prefix:e})}function zt(e,n){return new ka({check:"string_format",format:"ends_with",...k(n),suffix:e})}function $i(e,n,i){return new xa({check:"property",property:e,schema:n,...k(i)})}function Pt(e,n){return new wa({check:"properties",shape:e,...k(n)})}function Ot(e,n){return new Ia({check:"mime_type",mime:e,...k(n)})}function ge(e){return new Sa({check:"overwrite",tx:e})}function jt(e){return ge(n=>n.normalize(e))}function Nt(){return ge(e=>e.trim())}function Et(){return ge(e=>e.toLowerCase())}function Dt(){return ge(e=>e.toUpperCase())}function Tt(){return ge(e=>so(e))}function Iu(e,n,i){return new e({type:"array",element:n,...k(i)})}function Ky(e,n,i){return new e({type:"union",options:n,...k(i)})}function Wy(e,n,i){return new e({type:"union",options:n,inclusive:!1,...k(i)})}function Gy(e,n,i,o){return new e({type:"union",options:i,discriminator:n,...k(o)})}function Xy(e,n,i){return new e({type:"intersection",left:n,right:i})}function qy(e,n,i,o){let t=i instanceof O,r=t?o:i,a=t?i:null;return new e({type:"tuple",items:n,rest:a,...k(r)})}function Hy(e,n,i,o){return new e({type:"record",keyType:n,valueType:i,...k(o)})}function Yy(e,n,i,o){return new e({type:"map",keyType:n,valueType:i,...k(o)})}function Qy(e,n,i){return new e({type:"set",valueType:n,...k(i)})}function eb(e,n,i){let o=Array.isArray(n)?Object.fromEntries(n.map(t=>[t,t])):n;return new e({type:"enum",entries:o,...k(i)})}function tb(e,n,i){return new e({type:"enum",entries:n,...k(i)})}function nb(e,n,i){return new e({type:"literal",values:Array.isArray(n)?n:[n],...k(i)})}function Su(e,n){return new e({type:"file",...k(n)})}function rb(e,n){return new e({type:"transform",transform:n})}function ib(e,n){return new e({type:"optional",innerType:n})}function ob(e,n){return new e({type:"nullable",innerType:n})}function ab(e,n,i){return new e({type:"default",innerType:n,get defaultValue(){return typeof i=="function"?i():Xt(i)}})}function cb(e,n,i){return new e({type:"nonoptional",innerType:n,...k(i)})}function ub(e,n){return new e({type:"success",innerType:n})}function sb(e,n,i){return new e({type:"catch",innerType:n,catchValue:typeof i=="function"?i:vo(i)})}function lb(e,n,i){return new e({type:"pipe",in:n,out:i})}function db(e,n){return new e({type:"readonly",innerType:n})}function pb(e,n,i){return new e({type:"template_literal",parts:n,...k(i)})}function fb(e,n){return new e({type:"lazy",getter:n})}function mb(e,n){return new e({type:"promise",innerType:n})}function zu(e,n,i){let o=k(i);return o.abort??(o.abort=!0),new e({type:"custom",check:"custom",fn:n,...o})}function Pu(e,n,i){return new e({type:"custom",check:"custom",fn:n,...k(i)})}function Ou(e,n){let i=Fp(o=>(o.addIssue=t=>{if(typeof t=="string")o.issues.push(pt(t,o.value,i._zod.def));else{let r=t;r.fatal&&(r.continue=!1),r.code??(r.code="custom"),"input"in r||(r.input=o.value),r.inst??(r.inst=i),r.continue??(r.continue=!i._zod.def.abort),o.issues.push(pt(r))}},e(o.value,o)),n);return i}function Fp(e,n){let i=new R({check:"custom",...k(n)});return i._zod.check=e,i}function ju(e){let n=new R({check:"describe"});return n._zod.onattach=[i=>{let o=X.get(i)??{};X.add(i,{...o,description:e})}],n._zod.check=()=>{},n}function Nu(e){let n=new R({check:"meta"});return n._zod.onattach=[i=>{let o=X.get(i)??{};X.add(i,{...o,...e})}],n._zod.check=()=>{},n}function Eu(e,n){let i=k(n),o=i.truthy??["true","1","yes","on","y","enabled"],t=i.falsy??["false","0","no","off","n","disabled"];i.case!=="sensitive"&&(o=o.map(m=>typeof m=="string"?m.toLowerCase():m),t=t.map(m=>typeof m=="string"?m.toLowerCase():m));let r=new Set(o),a=new Set(t),c=e.Codec??yn,u=e.Boolean??vn,s=e.String??Ke,l=new s({type:"string",error:i.error}),p=new u({type:"boolean",error:i.error}),f=new c({type:"pipe",in:l,out:p,transform:(m,h)=>{let _=m;return i.case!=="sensitive"&&(_=_.toLowerCase()),r.has(_)?!0:a.has(_)?!1:(h.issues.push({code:"invalid_value",expected:"stringbool",values:[...r,...a],input:h.value,inst:f,continue:!1}),{})},reverseTransform:(m,h)=>m===!0?o[0]||"true":t[0]||"false",error:i.error});return f._zod.bag.truthy=o,f._zod.bag.falsy=t,f._zod.bag.case=i.case??"insensitive",f}function et(e,n,i,o={}){let t=k(o),r={check:"string_format",type:"string",format:n,fn:typeof i=="function"?i:c=>i.test(c),...t};return i instanceof RegExp&&(r.pattern=i),new e(r)}function jn(e,...n){for(let i of n)for(let o of Reflect.ownKeys(i))Object.prototype.propertyIsEnumerable.call(i,o)&&G(e,o,i[o]);return e}function De(e){let n=e?.target??"draft-2020-12";return n==="draft-4"&&(n="draft-04"),n==="draft-7"&&(n="draft-07"),{processors:e.processors??{},metadataRegistry:e?.metadata??X,target:n,unrepresentable:e?.unrepresentable??"throw",override:e?.override??(()=>{}),io:e?.io??"output",counter:0,seen:new Map,sharedDefsExtractedFor:void 0,sharedEmitDoneFor:void 0,cycles:e?.cycles??"ref",reused:e?.reused??"inline",intersections:[],deferred:[],external:e?.external??void 0}}function J(e,n,i,o,t){let r=typeof n.unrepresentable=="function"?n.unrepresentable({zodSchema:e,path:o.path,message:t}):n.unrepresentable;if(r==="any")return!1;if(r===void 0||r==="throw")throw new Error(t);return Object.assign(i,r),!0}function C(e,n,i={path:[],schemaPath:[]}){var o;let t=e._zod.def,r=n.seen.get(e);if(r)return r.count++,i.schemaPath.includes(e)&&(r.cycle=i.path),r.schema;let a={schema:{},count:1,cycle:void 0,path:i.path};n.seen.set(e,a),n.sharedDefsExtractedFor=void 0,n.sharedEmitDoneFor=void 0;let c=e._zod.toJSONSchema?.();if(c)a.schema=c;else{let l={...i,schemaPath:[...i.schemaPath,e],path:i.path};if(e._zod.processJSONSchema)e._zod.processJSONSchema(n,a.schema,l);else{let f=a.schema,m=n.processors[t.type];if(!m)throw new Error(`[toJSONSchema]: Non-representable type encountered: ${t.type}`);m(e,n,f,l)}let p=e._zod.parent;p&&(a.ref||(a.ref=p),C(p,n,l),n.seen.get(p).isParent=!0)}let u=n.metadataRegistry.get(e);return u&&jn(a.schema,u),n.io==="input"&&te(e)&&(delete a.schema.examples,delete a.schema.default),n.io==="input"&&"_prefault"in a.schema&&((o=a.schema).default??(o.default=a.schema._prefault)),delete a.schema._prefault,n.seen.get(e).schema}function Jp(e){return e.replace(/~/g,"~0").replace(/\//g,"~1")}function Te(e,n){let i=e.seen.get(n);if(!i)throw new Error("Unprocessed schema. This is a bug in Zod.");if(e.external&&e.sharedDefsExtractedFor===e.external)return;let o=new Map;for(let a of e.seen.entries()){let c=e.metadataRegistry.get(a[0])?.id;if(c){let u=o.get(c);if(u&&u!==a[0])throw new Error(`Duplicate schema id "${c}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);o.set(c,a[0])}}let t=a=>{let c=e.target==="draft-2020-12"?"$defs":"definitions";if(e.external){let p=e.external.registry.get(a[0])?.id,f=e.external.uri??(h=>h);if(p)return{ref:f(p)};let m=a[1].defId??a[1].schema.id??`schema${e.counter++}`;return a[1].defId=m,{defId:m,ref:`${f("__shared")}#/${c}/${Jp(m)}`}}let u="#",s=`${u}/${c}/`;if(a[1]===i&&!a[1].schema.id)return{ref:u};let l=a[1].schema.id??`__schema${e.counter++}`;return{defId:l,ref:s+Jp(l)}},r=a=>{if(a[1].schema.$ref)return;let c=a[1],{ref:u,defId:s}=t(a);c.def={...c.schema},s&&(c.defId=s);let l=c.schema;for(let p in l)delete l[p];l.$ref=u};if(e.cycles==="throw")for(let a of e.seen.entries()){let c=a[1];if(c.cycle)throw new Error(`Cycle detected: #/${c.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`)}for(let a of e.seen.entries()){let c=a[1];if(n===a[0]){r(a);continue}if(e.external){let s=e.external.registry.get(a[0])?.id;if(n!==a[0]&&s){r(a);continue}}if(e.metadataRegistry.get(a[0])?.id){r(a);continue}if(c.cycle){r(a);continue}c.count>1&&e.reused==="ref"&&r(a)}e.external&&(e.sharedDefsExtractedFor=e.external)}function Gp(e){let n=e.anyOf;if(!Array.isArray(n)||n.length===0||e.type!==void 0)return;let i=[];for(let o of n){if(!o||typeof o!="object")return;Gp(o);let t=Object.keys(o);if(t.length!==1||t[0]!=="type")return;let r=o.type;for(let a of Array.isArray(r)?r:[r]){if(typeof a!="string")return;i.includes(a)||i.push(a)}}delete e.anyOf,e.type=i.length===1?i[0]:i}var Xp=new Set(["type","properties","required","additionalProperties"]),Kp=["oneOf","anyOf"];function Wp(e){let n=e.additionalProperties;return n===void 0||n===!1||typeof n!="object"||n===null?null:Object.keys(n).length?n:null}function Du(e){let n=[];for(let r of e){if(typeof r!="object"||r.type!=="object")return null;for(let a in r)if(!Xp.has(a))return null;n.push(r)}let i={},o=new Set;for(let r of n){for(let a in r.properties){if(Object.prototype.hasOwnProperty.call(i,a))continue;let c=[];for(let s of n){let l=s.properties?.[a]??Wp(s);l!=null&&(c.some(p=>JSON.stringify(p)===JSON.stringify(l))||c.push(l))}let u=c.length===1?c[0]:Du(c)??{allOf:c};G(i,a,u)}for(let a of r.required??[])o.add(a)}let t={type:"object",properties:i};if(o.size&&(t.required=[...o]),n.every(r=>r.additionalProperties===!1))t.additionalProperties=!1;else{let r=[];for(let a of n){let c=Wp(a);c&&!r.some(u=>JSON.stringify(u)===JSON.stringify(c))&&r.push(c)}r.length===1?t.additionalProperties=r[0]:r.length>1&&(t.additionalProperties={allOf:r})}return t}function gb(e){let n=e.allOf;if(!Array.isArray(n)||n.length<2)return;for(let t of Xp)if(t in e)return;let i=n.filter(t=>Kp.some(r=>Array.isArray(t[r]))),o=null;if(!i.length)o=Du(n);else{let t=i[0],r=Kp.find(u=>Array.isArray(t[u]));if(Object.keys(t).length!==1)return;let a=n.filter(u=>u!==t),c=t[r].map(u=>Du([...a,u]));if(c.some(u=>!u))return;o={[r]:c}}o&&(delete e.allOf,jn(e,o))}function Ae(e,n){let i=e.seen.get(n);if(!i)throw new Error("Unprocessed schema. This is a bug in Zod.");let o=c=>{let u=e.seen.get(c);if(u.ref===null)return;let s=u.def??u.schema,l={...s},p=u.ref;if(u.ref=null,p){o(p);let m=e.seen.get(p),h=m.schema;if(h.$ref&&(e.target==="draft-07"||e.target==="draft-04"||e.target==="openapi-3.0")?(s.allOf=s.allOf??[],s.allOf.push(h)):jn(s,h),jn(s,l),c._zod.parent===p)for(let x in s)x==="$ref"||x==="allOf"||x in l||delete s[x];if(h.$ref&&m.def)for(let x in s)x==="$ref"||x==="allOf"||x in m.def&&JSON.stringify(s[x])===JSON.stringify(m.def[x])&&delete s[x]}let f=c._zod.parent;if(f&&f!==p){o(f);let m=e.seen.get(f);if(m?.schema.$ref&&(s.$ref=m.schema.$ref,m.def))for(let h in s)h==="$ref"||h==="allOf"||h in m.def&&JSON.stringify(s[h])===JSON.stringify(m.def[h])&&delete s[h]}e.override({zodSchema:c,jsonSchema:s,path:u.path??[]})};if(!e.external||e.sharedEmitDoneFor!==e.external){for(let c of[...e.seen.entries()].reverse())o(c[0]);if(e.target!=="openapi-3.0")for(let c of e.seen.entries())Gp(c[1].def??c[1].schema);for(let c of e.deferred)c();if(e.intersections.length){let c=new Map;for(let u of e.seen.values())for(let s of[u.schema,u.def]){let l=s?.allOf;if(!Array.isArray(l))continue;let p=c.get(l);p?p.push(s):c.set(l,[s])}for(let u of e.intersections)for(let s of c.get(u)??[])gb(s)}}let t={};if(e.target==="draft-2020-12"?t.$schema="https://json-schema.org/draft/2020-12/schema":e.target==="draft-07"?t.$schema="http://json-schema.org/draft-07/schema#":e.target==="draft-04"?t.$schema="http://json-schema.org/draft-04/schema#":e.target,e.external?.uri){let c=e.external.registry.get(n)?.id;if(!c)throw new Error("Schema is missing an `id` property");t.$id=e.external.uri(c)}jn(t,i.defId?i.schema:i.def??i.schema);let r=e.metadataRegistry.get(n)?.id;r!==void 0&&t.id===r&&delete t.id;let a=e.external?.defs??{};if(!e.external||e.sharedEmitDoneFor!==e.external)for(let c of e.seen.entries()){let u=c[1];u.def&&u.defId&&(u.def.id===u.defId&&delete u.def.id,G(a,u.defId,u.def))}e.external&&(e.sharedEmitDoneFor=e.external),e.external||Object.keys(a).length>0&&(e.target==="draft-2020-12"?t.$defs=a:t.definitions=a);try{let c=JSON.parse(JSON.stringify(t));return Object.defineProperty(c,"~standard",{value:{...n["~standard"],jsonSchema:{input:At(n,"input",e.processors),output:At(n,"output",e.processors)}},enumerable:!1,writable:!1}),c}catch{throw new Error("Error converting schema to JSON.")}}function te(e,n){let i=n??{seen:new Set};if(i.seen.has(e))return!1;i.seen.add(e);let o=e._zod.def;if(o.type==="transform")return!0;if(o.type==="array")return te(o.element,i);if(o.type==="set")return te(o.valueType,i);if(o.type==="lazy")return te(o.getter(),i);if(o.type==="promise"||o.type==="optional"||o.type==="nonoptional"||o.type==="nullable"||o.type==="readonly"||o.type==="default"||o.type==="prefault"||o.type==="catch")return te(o.innerType,i);if(o.type==="intersection")return te(o.left,i)||te(o.right,i);if(o.type==="record"||o.type==="map")return te(o.keyType,i)||te(o.valueType,i);if(o.type==="pipe")return e._zod.traits.has("$ZodCodec")?!0:te(o.in,i)||te(o.out,i);if(o.type==="object"){for(let t in o.shape)if(te(o.shape[t],i))return!0;return!1}if(o.type==="union"){for(let t of o.options)if(te(t,i))return!0;return!1}if(o.type==="tuple"){for(let t of o.items)if(te(t,i))return!0;return!!(o.rest&&te(o.rest,i))}return!1}var Tu=(e,n={})=>i=>{let o=De({...i,processors:n});return C(e,o),Te(o,e),Ae(o,e)},At=(e,n,i={})=>o=>{let{libraryOptions:t,target:r}=o??{},a=De({...t??{},target:r,io:n,processors:i});return C(e,a),Te(a,e),Ae(a,e)};var Ut=(e,n,i)=>{(e[n]===void 0||i>e[n])&&(e[n]=i)},Lt=(e,n,i)=>{(e[n]===void 0||i<e[n])&&(e[n]=i)},qp=(e,n)=>{Ut(e,"minimum",n),Lt(e,"maximum",n)},ef=(e,n)=>{e.multipleOf??(e.multipleOf=[]),e.multipleOf.includes(n)||e.multipleOf.push(n)},tf=(e,n)=>{e.patterns??(e.patterns=new Set),e.patterns.add(n)},nf=(e,n)=>{e.mime=e.mime?e.mime.filter(i=>n.includes(i)):[...n]},rf=(e,n)=>{e.format=n,n.includes("int")&&(e.isInt=!0)},Hp=(e,n)=>Ut(e,"minimum",n.minimum),Yp=(e,n)=>Lt(e,"maximum",n.maximum),Qp=e=>(n,i)=>{rf(n,i.format);let[o,t]=e[i.format];Ut(n,"minimum",o),Lt(n,"maximum",t)},vb={greater_than:(e,n)=>Ut(e,n.inclusive?"minimum":"exclusiveMinimum",n.value),less_than:(e,n)=>Lt(e,n.inclusive?"maximum":"exclusiveMaximum",n.value),multiple_of:(e,n)=>ef(e,n.value),number_format:Qp(Ht),bigint_format:Qp(Yt),min_length:Hp,max_length:Yp,length_equals:(e,n)=>qp(e,n.length),min_size:Hp,max_size:Yp,size_equals:(e,n)=>qp(e,n.size),string_format:(e,n)=>{rf(e,n.format),n.pattern&&tf(e,n.pattern),(n.format==="base64"||n.format==="base64url")&&(e.contentEncoding=n.format),(n.local||n.precision===-1)&&(e.laxFormat=!0)},mime_type:(e,n)=>nf(e,n.mime)};function K(e){let n={},i=e._zod.def,o=e._zod.traits.has("$ZodCheck")?[e,...i.checks??[]]:i.checks??[];for(let r of o)vb[r._zod.def.check]?.(n,r._zod.def);let t=e._zod.bag;t.minimum!==void 0&&Ut(n,"minimum",t.minimum),t.exclusiveMinimum!==void 0&&Ut(n,"exclusiveMinimum",t.exclusiveMinimum),t.maximum!==void 0&&Lt(n,"maximum",t.maximum),t.exclusiveMaximum!==void 0&&Lt(n,"exclusiveMaximum",t.exclusiveMaximum),t.multipleOf!==void 0&&ef(n,t.multipleOf),t.format!==void 0&&(n.format??(n.format=t.format),t.format.includes("int")&&(n.isInt=!0)),t.mime&&nf(n,t.mime);for(let r of t.patterns??[])tf(n,r);return n}var hb={guid:"uuid",url:"uri",datetime:"date-time",json_string:"json-string",regex:""},yb=new Map([[Ir,Bo],[gn,Mo]]),of=e=>yb.get(e)??e,Lu=(e,n,i,o)=>{let t=i;t.type="string";let{minimum:r,maximum:a,format:c,patterns:u,contentEncoding:s,laxFormat:l}=K(e);if(typeof r=="number"&&(t.minLength=r),typeof a=="number"&&(t.maxLength=a),c&&(t.format=hb[c]??c,t.format===""&&delete t.format,(c==="time"||l)&&delete t.format),s&&(t.contentEncoding=s),u&&u.size>0){let p=[...u].map(of);p.length===1?t.pattern=p[0].source:p.length>1&&(t.allOf=[...p.map(f=>({...n.target==="draft-07"||n.target==="draft-04"||n.target==="openapi-3.0"?{type:"string"}:{},pattern:f.source}))])}},Cu=(e,n,i,o)=>{let t=i,{minimum:r,maximum:a,multipleOf:c,exclusiveMaximum:u,exclusiveMinimum:s,isInt:l}=K(e);t.type=l?"integer":"number";let p=typeof s=="number"&&s>=(r??Number.NEGATIVE_INFINITY),f=typeof u=="number"&&u<=(a??Number.POSITIVE_INFINITY),m=n.target==="draft-04"||n.target==="openapi-3.0";if(p?m?(t.minimum=s,t.exclusiveMinimum=!0):t.exclusiveMinimum=s:typeof r=="number"&&(t.minimum=r),f?m?(t.maximum=u,t.exclusiveMaximum=!0):t.exclusiveMaximum=u:typeof a=="number"&&(t.maximum=a),c){let h=new Set;for(let z of c)Number.isFinite(z)&&z!==0?h.add(Math.abs(z)):J(e,n,t,o,`A multipleOf divisor of ${z} cannot be represented in JSON Schema`);let[_,...x]=h;_!==void 0&&(t.multipleOf=_),x.length&&(t.allOf=[...t.allOf??[],...x.map(z=>({multipleOf:z}))])}},Zu=(e,n,i,o)=>{i.type="boolean"},Ru=(e,n,i,o)=>{J(e,n,i,o,"BigInt cannot be represented in JSON Schema")},Vu=(e,n,i,o)=>{J(e,n,i,o,"Symbols cannot be represented in JSON Schema")},Bu=(e,n,i,o)=>{n.target==="openapi-3.0"?(i.type="string",i.nullable=!0,i.enum=[null]):i.type="null"},Mu=(e,n,i,o)=>{J(e,n,i,o,"Undefined cannot be represented in JSON Schema")},Fu=(e,n,i,o)=>{J(e,n,i,o,"Void cannot be represented in JSON Schema")},Ju=(e,n,i,o)=>{i.not={}},Ku=(e,n,i,o)=>{},Wu=(e,n,i,o)=>{},Gu=(e,n,i,o)=>{J(e,n,i,o,"Date cannot be represented in JSON Schema")},Xu=(e,n,i,o)=>{let t=e._zod.def,r=ut(t.entries);if(r.length===0){i.not={};return}r.every(a=>typeof a=="number")&&(i.type="number"),r.every(a=>typeof a=="string")&&(i.type="string"),i.enum=r},qu=(e,n,i,o)=>{let t=e._zod.def;if(t.values.length===0){i.not={};return}let r=[];for(let a of t.values)if(a===void 0){if(J(e,n,i,o,"Literal `undefined` cannot be represented in JSON Schema"))return}else if(typeof a=="bigint"){if(J(e,n,i,o,"BigInt literals cannot be represented in JSON Schema"))return;r.push(Number(a))}else r.push(a);if(r.length!==0)if(r.length===1){let a=r[0];i.type=a===null?"null":typeof a,n.target==="draft-04"||n.target==="openapi-3.0"?i.enum=[a]:i.const=a}else r.every(a=>typeof a=="number")&&(i.type="number"),r.every(a=>typeof a=="string")&&(i.type="string"),r.every(a=>typeof a=="boolean")&&(i.type="boolean"),r.every(a=>a===null)&&(i.type="null"),i.enum=r},Hu=(e,n,i,o)=>{J(e,n,i,o,"NaN cannot be represented in JSON Schema")},Yu=(e,n,i,o)=>{let t=i,r=e._zod.pattern;if(!r)throw new Error("Pattern not found in template literal");t.type="string",t.pattern=r.source},Qu=(e,n,i,o)=>{let t=i;t.type="string",t.format="binary",t.contentEncoding="binary";let{minimum:r,maximum:a,mime:c}=K(e);r!==void 0&&(t.minLength=r),a!==void 0&&(t.maxLength=a),c&&(c.length===0?t.not={}:c.length===1?t.contentMediaType=c[0]:t.anyOf=c.map(u=>({contentMediaType:u})))},es=(e,n,i,o)=>{i.type="boolean"},ts=(e,n,i,o)=>{J(e,n,i,o,"Custom types cannot be represented in JSON Schema")},ns=(e,n,i,o)=>{J(e,n,i,o,"Function types cannot be represented in JSON Schema")},rs=(e,n,i,o)=>{J(e,n,i,o,"Transforms cannot be represented in JSON Schema")},is=(e,n,i,o)=>{J(e,n,i,o,"Map cannot be represented in JSON Schema")},os=(e,n,i,o)=>{J(e,n,i,o,"Set cannot be represented in JSON Schema")},as=(e,n,i,o)=>{let t=i,r=e._zod.def,{minimum:a,maximum:c}=K(e);typeof a=="number"&&(t.minItems=a),typeof c=="number"&&(t.maxItems=c),t.type="array",t.items=C(r.element,n,{...o,path:[...o.path,"items"]})};function Nn(e){let n=e._zod.def;return n.type==="pipe"&&n.in._zod.traits.has("$ZodTransform")?Nn(n.out):n.type==="catch"?Nn(n.innerType):e._zod.optin}var cs=(e,n,i,o)=>{let t=i,r=e._zod.def,a=r.shape;if(Object.getOwnPropertySymbols(a).length&&J(e,n,t,o,"Symbol keys cannot be represented in JSON Schema"))return;t.type="object",t.properties={};for(let s in a)G(t.properties,s,C(a[s],n,{...o,path:[...o.path,"properties",s]}));let u=[];for(let s of Object.keys(a)){let l=r.shape[s];(n.io==="input"?Nn(l)===void 0:l._zod.optout===void 0)&&u.push(s)}u.length>0&&(t.required=u),r.catchall?._zod.def.type==="never"?t.additionalProperties=!1:r.catchall?r.catchall&&(t.additionalProperties=C(r.catchall,n,{...o,path:[...o.path,"additionalProperties"]})):n.io==="output"&&(t.additionalProperties=!1)},ki=(e,n,i,o)=>{let t=e._zod.def,r=t.inclusive===!1,a=t.options.map((c,u)=>C(c,n,{...o,path:[...o.path,r?"oneOf":"anyOf",u]}));r?i.oneOf=a:i.anyOf=a},us=(e,n,i,o)=>{let t=e._zod.def,r=C(t.left,n,{...o,path:[...o.path,"allOf",0]}),a=C(t.right,n,{...o,path:[...o.path,"allOf",1]}),c=s=>"allOf"in s&&Object.keys(s).length===1,u=[...c(r)?r.allOf:[r],...c(a)?a.allOf:[a]];i.allOf=u,n.intersections.push(u)},ss=(e,n,i,o)=>{let t=i,r=e._zod.def;t.type="array";let a=n.target==="draft-2020-12"?"prefixItems":"items",c=n.target==="draft-2020-12"||n.target==="openapi-3.0"?"items":"additionalItems",u=r.items.map((_,x)=>C(_,n,{...o,path:[...o.path,a,x]})),s=r.rest?C(r.rest,n,{...o,path:[...o.path,c,...n.target==="openapi-3.0"?[r.items.length]:[]]}):null,l=r.items.length;for(;l>0;){let _=r.items[l-1];if(!(n.io==="input"?Nn(_)!==void 0:_._zod.optout==="optional"))break;l--}let p=r.items.length,f=!r.rest;n.target==="draft-2020-12"?(t.prefixItems=u,f?t.items=!1:s&&(t.items=s),l>0&&(t.minItems=l),f&&(t.maxItems=p)):n.target==="openapi-3.0"?(t.items={anyOf:u},s&&t.items.anyOf.push(s),l>0&&(t.minItems=l),f&&(t.maxItems=p)):(t.items=u,f?t.additionalItems=!1:s&&(t.additionalItems=s),l>0&&(t.minItems=l),f&&(t.maxItems=p));let{minimum:m,maximum:h}=K(e);typeof m=="number"&&(t.minItems=m),typeof h=="number"&&(t.maxItems=h)};function Au(e,n,i){if(n.$ref){if(i.has(n))return n;i.add(n);let h=e.get(n)?.def;if(!h)return n;let _=Au(e,h,i);return _===h?n:_}for(let h of["anyOf","oneOf"]){let _=n[h];if(!Array.isArray(_))continue;let x=_.map(z=>Au(e,z,i));x.some((z,I)=>z!==_[I])&&(n={...n,[h]:x})}let o=Array.isArray(n.type)?n.type:[n.type],t=!o.includes("string")&&o.some(h=>h==="number"||h==="integer"),r=n.enum??(n.const!==void 0?[n.const]:void 0);if(!t&&!r?.some(h=>typeof h=="number"))return n;let{minimum:a,maximum:c,exclusiveMinimum:u,exclusiveMaximum:s,multipleOf:l,format:p,id:f,...m}=n;return m.enum?m.enum=m.enum.map(h=>typeof h=="number"?String(h):h):typeof m.const=="number"&&(m.const=String(m.const)),t&&(m.type="string",r||(m.pattern=(o.includes("number")?we:un).source)),m}var Uu=new WeakMap;function bb(e){let n=new Map;for(let o of e.seen.values())o.def&&!n.has(o.schema)&&n.set(o.schema,o);let i=new Map;for(let o of Uu.get(e)??[]){let t=e.seen.get(o),r=(t?.def??t?.schema)?.propertyNames;if(!r||r===!0||i.has(r))continue;let a=Au(n,r,new Set);a!==r&&i.set(r,a)}if(i.size)for(let o of e.seen.values())for(let t of[o.schema,o.def]){let r=t&&i.get(t.propertyNames);r&&(t.propertyNames=r)}}var ls=(e,n,i,o)=>{let t=i,r=e._zod.def;t.type="object";let a=r.keyType,c=K(a).patterns;if(r.mode==="loose"&&c&&c.size>0){let l=C(r.valueType,n,{...o,path:[...o.path,"patternProperties","*"]});t.patternProperties={};for(let p of c)G(t.patternProperties,of(p).source,l)}else{if(n.target==="draft-07"||n.target==="draft-2020-12"){t.propertyNames=C(r.keyType,n,{...o,path:[...o.path,"propertyNames"]});let l=Uu.get(n);l||(l=[],Uu.set(n,l),n.deferred.push(()=>bb(n))),l.push(e)}t.additionalProperties=C(r.valueType,n,{...o,path:[...o.path,"additionalProperties"]})}let u=a._zod.values,s=n.io==="input"&&Nn(r.valueType)!==void 0;if(u&&!r.partial&&!s){let l=[...u].filter(p=>typeof p=="string"||typeof p=="number");l.length>0&&(t.required=l.map(String))}},ds=(e,n,i,o)=>{let t=e._zod.def,r=C(t.innerType,n,o),a=n.seen.get(e);n.target==="openapi-3.0"?(a.ref=t.innerType,i.nullable=!0):i.anyOf=[r,{type:"null"}]},ps=(e,n,i,o)=>{let t=e._zod.def;C(t.innerType,n,o);let r=n.seen.get(e);r.ref=t.innerType},fs=Symbol();function af(e,n,i,o,t){let r=!1,a=JSON.stringify(e,(c,u)=>typeof u!="bigint"?u:(r=!0,null));return r?(J(n,i,o,t,"BigInt defaults cannot be represented in JSON Schema"),fs):JSON.parse(a)}var ms=(e,n,i,o)=>{let t=e._zod.def;C(t.innerType,n,o);let r=n.seen.get(e);r.ref=t.innerType;let a=af(t.defaultValue,e,n,i,o);a!==fs&&(i.default=a)},gs=(e,n,i,o)=>{let t=e._zod.def;C(t.innerType,n,o);let r=n.seen.get(e);if(r.ref=t.innerType,n.io!=="input")return;let a=af(t.defaultValue,e,n,i,o);a!==fs&&(i._prefault=a)},vs=(e,n,i,o)=>{let t=e._zod.def;C(t.innerType,n,o);let r=n.seen.get(e);r.ref=t.innerType;let a;try{a=t.catchValue(void 0)}catch{J(e,n,i,o,"Dynamic catch values are not supported in JSON Schema");return}i.default=a},hs=(e,n,i,o)=>{let t=e._zod.def,r=t.in._zod.traits.has("$ZodTransform"),a=n.io==="input"?r?t.out:t.in:t.out;C(a,n,o);let c=n.seen.get(e);c.ref=a},ys=(e,n,i,o)=>{let t=e._zod.def;C(t.innerType,n,o);let r=n.seen.get(e);r.ref=t.innerType,i.readOnly=!0},bs=(e,n,i,o)=>{let t=e._zod.def;C(t.innerType,n,o);let r=n.seen.get(e);r.ref=t.innerType},xi=(e,n,i,o)=>{let t=e._zod.def;C(t.innerType,n,o);let r=n.seen.get(e);r.ref=t.innerType},$s=(e,n,i,o)=>{let t=e._zod.innerType;C(t,n,o);let r=n.seen.get(e);r.ref=t},_i={string:Lu,number:Cu,boolean:Zu,bigint:Ru,symbol:Vu,null:Bu,undefined:Mu,void:Fu,never:Ju,any:Ku,unknown:Wu,date:Gu,enum:Xu,literal:qu,nan:Hu,template_literal:Yu,file:Qu,success:es,custom:ts,function:ns,transform:rs,map:is,set:os,array:as,object:cs,union:ki,intersection:us,tuple:ss,record:ls,nullable:ds,nonoptional:ps,default:ms,prefault:gs,catch:vs,pipe:hs,readonly:ys,promise:bs,optional:xi,lazy:$s};function wi(e,n){if("_idmap"in e){let o=e,t=De({...n,processors:_i}),r={};for(let u of o._idmap.entries()){let[s,l]=u;C(l,t)}let a={},c={registry:o,uri:n?.uri,defs:r};t.external=c;for(let u of o._idmap.entries()){let[s,l]=u;Te(t,l),G(a,s,Ae(t,l))}if(Object.keys(r).length>0){let u=t.target==="draft-2020-12"?"$defs":"definitions";a.__shared={[u]:r}}return{schemas:a}}let i=De({...n,processors:_i});return C(e,i),Te(i,e),Ae(i,e)}var Ii=class{get metadataRegistry(){return this.ctx.metadataRegistry}get target(){return this.ctx.target}get unrepresentable(){return this.ctx.unrepresentable}get override(){return this.ctx.override}get io(){return this.ctx.io}get counter(){return this.ctx.counter}set counter(n){this.ctx.counter=n}get seen(){return this.ctx.seen}constructor(n){let i=n?.target??"draft-2020-12";i==="draft-4"&&(i="draft-04"),i==="draft-7"&&(i="draft-07"),this.ctx=De({processors:_i,target:i,...n?.metadata&&{metadata:n.metadata},...n?.unrepresentable&&{unrepresentable:n.unrepresentable},...n?.override&&{override:n.override},...n?.io&&{io:n.io}})}process(n,i={path:[],schemaPath:[]}){return C(n,this.ctx,i)}emit(n,i){i&&(i.cycles&&(this.ctx.cycles=i.cycles),i.reused&&(this.ctx.reused=i.reused),i.external&&(this.ctx.external=i.external)),this.ctx.sharedDefsExtractedFor=void 0,this.ctx.sharedEmitDoneFor=void 0,Te(this.ctx,n);let o=Ae(this.ctx,n),{"~standard":t,...r}=o;return r}};var cf={};var Jt={};_e(Jt,{ZodAny:()=>Bs,ZodArray:()=>Ks,ZodBase64:()=>Fi,ZodBase64URL:()=>Ji,ZodBigInt:()=>Mt,ZodBigIntFormat:()=>Gi,ZodBoolean:()=>Bt,ZodCIDRv4:()=>Bi,ZodCIDRv6:()=>Mi,ZodCUID:()=>Ai,ZodCUID2:()=>Ui,ZodCatch:()=>fl,ZodCodec:()=>Vn,ZodCreditCard:()=>Ts,ZodCustom:()=>Bn,ZodCustomStringFormat:()=>it,ZodDate:()=>An,ZodDefault:()=>cl,ZodDiscriminatedUnion:()=>Gs,ZodE164:()=>Ki,ZodEmail:()=>Ni,ZodEmoji:()=>Di,ZodEnum:()=>Zt,ZodExactOptional:()=>Yi,ZodFile:()=>rl,ZodFunction:()=>xl,ZodGUID:()=>Ei,ZodIBAN:()=>As,ZodIPv4:()=>Ri,ZodIPv6:()=>Vi,ZodISODate:()=>Le,ZodISODateTime:()=>Ue,ZodISODuration:()=>Ze,ZodISOTime:()=>Ce,ZodInstanceOf:()=>Sl,ZodIntersection:()=>Xs,ZodJWT:()=>Wi,ZodKSUID:()=>Zi,ZodLazy:()=>$l,ZodLiteral:()=>nl,ZodMAC:()=>Ds,ZodMap:()=>el,ZodNaN:()=>gl,ZodNanoID:()=>Ti,ZodNever:()=>Fs,ZodNonOptional:()=>Qi,ZodNull:()=>Rs,ZodNullable:()=>al,ZodNumber:()=>Vt,ZodNumberFormat:()=>ot,ZodObject:()=>Ln,ZodOptional:()=>Zn,ZodPipe:()=>Rn,ZodPrefault:()=>sl,ZodPreprocess:()=>vl,ZodPromise:()=>kl,ZodReadonly:()=>hl,ZodRecord:()=>Ct,ZodSet:()=>tl,ZodString:()=>Rt,ZodStringFormat:()=>Z,ZodSuccess:()=>pl,ZodSymbol:()=>Cs,ZodTemplateLiteral:()=>bl,ZodTransform:()=>il,ZodTuple:()=>Hs,ZodType:()=>N,ZodULID:()=>Li,ZodURL:()=>Tn,ZodUUID:()=>$e,ZodUndefined:()=>Zs,ZodUnion:()=>Cn,ZodUnknown:()=>Ms,ZodVoid:()=>Js,ZodXID:()=>Ci,ZodXor:()=>Ws,_ZodString:()=>ji,_default:()=>ul,_function:()=>bm,any:()=>qf,array:()=>Un,base64:()=>jf,base64url:()=>Nf,bigint:()=>Jf,boolean:()=>Ls,catch:()=>ml,check:()=>$m,cidrv4:()=>Pf,cidrv6:()=>Of,codec:()=>gm,creditCard:()=>Df,cuid:()=>$f,cuid2:()=>_f,currencyCode:()=>Zf,custom:()=>_m,date:()=>Yf,describe:()=>km,discriminatedUnion:()=>im,e164:()=>Ef,email:()=>lf,emoji:()=>yf,enum:()=>qi,exactOptional:()=>ol,file:()=>dm,float32:()=>Vf,float64:()=>Bf,function:()=>bm,guid:()=>df,hash:()=>Rf,hex:()=>Cf,hostname:()=>Lf,httpUrl:()=>hf,iban:()=>Tf,instanceof:()=>wm,int:()=>Pi,int32:()=>Mf,int64:()=>Kf,intersection:()=>qs,invertCodec:()=>vm,ipv4:()=>If,ipv6:()=>zf,json:()=>Sm,jwt:()=>Af,keyof:()=>Qf,ksuid:()=>wf,lazy:()=>_l,literal:()=>lm,looseObject:()=>nm,looseRecord:()=>am,mac:()=>Sf,map:()=>cm,meta:()=>xm,nan:()=>mm,nanoid:()=>bf,nativeEnum:()=>sm,never:()=>Xi,nonoptional:()=>dl,null:()=>Vs,nullable:()=>Dn,nullish:()=>pm,number:()=>Us,object:()=>em,optional:()=>nt,partialRecord:()=>om,pipe:()=>Oi,prefault:()=>ll,preprocess:()=>zm,promise:()=>ym,readonly:()=>yl,record:()=>Qs,refine:()=>wl,set:()=>um,strictObject:()=>tm,string:()=>En,stringFormat:()=>Uf,stringbool:()=>Im,success:()=>fm,superRefine:()=>Il,symbol:()=>Gf,templateLiteral:()=>hm,transform:()=>Hi,tuple:()=>Ys,uint32:()=>Ff,uint64:()=>Wf,ulid:()=>kf,undefined:()=>Xf,union:()=>Ft,unknown:()=>tt,url:()=>vf,uuid:()=>pf,uuidv4:()=>ff,uuidv6:()=>mf,uuidv7:()=>gf,void:()=>Hf,xid:()=>xf,xor:()=>rm});var Si={};_e(Si,{endsWith:()=>zt,gt:()=>ye,gte:()=>se,includes:()=>It,length:()=>Qe,lowercase:()=>xt,lt:()=>he,lte:()=>ue,maxLength:()=>Ye,maxSize:()=>Ee,mime:()=>Ot,minLength:()=>Ie,minSize:()=>be,multipleOf:()=>Ne,negative:()=>hi,nonnegative:()=>bi,nonpositive:()=>yi,normalize:()=>jt,overwrite:()=>ge,positive:()=>vi,properties:()=>Pt,property:()=>$i,regex:()=>kt,size:()=>He,slugify:()=>Tt,startsWith:()=>St,toLowerCase:()=>Et,toUpperCase:()=>Dt,trim:()=>Nt,uppercase:()=>wt});var uf=new WeakSet([Object.prototype,Error.prototype]);function zi(e,n,i){Object.defineProperty(e,n,{configurable:!0,enumerable:!1,get(){let o=i(this);return Object.defineProperty(this,n,{value:o,configurable:!0,writable:!0}),o},set(o){Object.defineProperty(this,n,{value:o,configurable:!0,writable:!0})}})}var sf=(e,n)=>{ko.init(e,n),e.name="ZodError";let i=Object.getPrototypeOf(e);uf.has(i)||(uf.add(i),zi(i,"format",o=>t=>rn(o,t)),zi(i,"flatten",o=>t=>nn(o,t)),zi(i,"addIssue",o=>t=>{o.issues.push(t),o.message=JSON.stringify(o.issues,st,2)}),zi(i,"addIssues",o=>t=>{o.issues.push(...t),o.message=JSON.stringify(o.issues,st,2)}),Object.defineProperty(i,"isEmpty",{configurable:!0,enumerable:!1,get(){return this.issues.length===0}}))},_b=g("ZodError",sf),ce=g("ZodError",sf,void 0,{Parent:Error});var _s=ft(ce),ks=mt(ce),xs=gt(ce),ws=vt(ce),Is=nr(ce),Ss=rr(ce),zs=ir(ce),Ps=or(ce),Os=ar(ce),js=cr(ce),Ns=ur(ce),Es=sr(ce);function xb(){W.localeError||M(Vr())}function rt(){W.memoizer||M({memoizer:kn()})}var N=g("ZodType",(e,n)=>(xb(),O.init(e,n),e.def=n,e.type=n.type,e),{check(...e){let n=this.def;return this.clone(y.mergeDefs(n,{checks:[...n.checks??[],...e.map(i=>typeof i=="function"?{_zod:{check:i,def:{check:"custom"},onattach:[]}}:i)]}),{parent:!0})},with(...e){return this.check(...e)},clone(e,n){return U(this,e,n)},brand(){return this},register(e,n){return e.add(this,n),this},refine(e,n){return this.check(wl(e,n))},superRefine(e,n){return this.check(Il(e,n))},overwrite(e){return this.check(ge(e))},optional(){return nt(this)},exactOptional(){return ol(this)},nullable(){return Dn(this)},nullish(){return nt(Dn(this))},nonoptional(e){return dl(this,e)},array(){return Un(this)},or(e){return Ft([this,e])},and(e){return qs(this,e)},transform(e){return Oi(this,Hi(e))},default(e){return ul(this,e)},prefault(e){return ll(this,e)},catch(e){return ml(this,e)},pipe(e){return Oi(this,e)},readonly(){return yl(this)},describe(e){let n=this.clone();return X.add(n,{description:e}),n},meta(...e){if(e.length===0)return X.get(this);let n=this.clone();return X.add(n,e[0]),n},isOptional(){return this.safeParse(void 0).success},isNullable(){return this.safeParse(null).success},apply(e,...n){return n.length===0?e(this):e(this,...n)},get"~standard"(){return y.hide(this,"~standard",{...$r(this),jsonSchema:{input:At(this,"input"),output:At(this,"output")}})},set"~standard"(e){y.own(this,"~standard",e)},parse:function e(n,i){return _s(this,n,i,{callee:e})},parseAsync:async function e(n,i){return await ks(this,n,i,{callee:e})},safeParse(e,n){return xs(this,e,n)},async safeParseAsync(e,n){return ws(this,e,n)},get spa(){return this?.safeParseAsync},set spa(e){y.own(this,"spa",e)},validate(e,n){return on(this,e,n)},validateAsync(e,n){return an(this,e,n)},encode:function e(n,i){return Is(this,n,i,{callee:e})},decode:function e(n,i){return Ss(this,n,i,{callee:e})},encodeAsync:async function e(n,i){return await zs(this,n,i,{callee:e})},decodeAsync:async function e(n,i){return await Ps(this,n,i,{callee:e})},safeEncode(e,n){return Os(this,e,n)},safeDecode(e,n){return js(this,e,n)},async safeEncodeAsync(e,n){return Ns(this,e,n)},async safeDecodeAsync(e,n){return Es(this,e,n)},toJSONSchema(e){return Tu(this,{})(e)},get description(){return X.get(this)?.description},get _def(){return this._zod.def}}),ji=g("_ZodString",(e,n)=>{Ke.init(e,n),N.init(e,n),e._zod.processJSONSchema=(i,o,t)=>Lu(e,i,o,t)},y.derived({format:e=>K(e).format??null,minLength:e=>K(e).minimum??null,maxLength:e=>K(e).maximum??null},{regex(...e){return this.check(kt(...e))},includes(...e){return this.check(It(...e))},startsWith(...e){return this.check(St(...e))},endsWith(...e){return this.check(zt(...e))},min(...e){return this.check(Ie(...e))},max(...e){return this.check(Ye(...e))},length(...e){return this.check(Qe(...e))},nonempty(...e){return this.check(Ie(1,...e))},lowercase(e){return this.check(xt(e))},uppercase(e){return this.check(wt(e))},trim(){return this.check(Nt())},normalize(...e){return this.check(jt(...e))},toLowerCase(){return this.check(Et())},toUpperCase(){return this.check(Dt())},slugify(){return this.check(Tt())}})),Rt=g("ZodString",(e,n)=>{Ke.init(e,n),ji.init(e,n)},{email(e){return this.check(Xr(Ni,e))},url(e){return this.check(In(Tn,e))},jwt(e){return this.check(gi(Wi,e))},emoji(e){return this.check(ti(Di,e))},guid(e){return this.check(qr(Ei,e))},uuid(e){return this.check(Hr($e,e))},uuidv4(e){return this.check(Yr($e,e))},uuidv6(e){return this.check(Qr($e,e))},uuidv7(e){return this.check(ei($e,e))},nanoid(e){return this.check(ni(Ti,e))},cuid(e){return this.check(ri(Ai,e))},cuid2(e){return this.check(ii(Ui,e))},ulid(e){return this.check(oi(Li,e))},base64(e){return this.check(pi(Fi,e))},base64url(e){return this.check(fi(Ji,e))},xid(e){return this.check(ai(Ci,e))},ksuid(e){return this.check(ci(Zi,e))},ipv4(e){return this.check(ui(Ri,e))},ipv6(e){return this.check(si(Vi,e))},cidrv4(e){return this.check(li(Bi,e))},cidrv6(e){return this.check(di(Mi,e))},e164(e){return this.check(mi(Ki,e))},datetime(e){return this.check(Sn(Ue,e))},date(e){return this.check(zn(Le,e))},time(e){return this.check(Pn(Ce,e))},duration(e){return this.check(On(Ze,e))}});function En(e){return qc(Rt,e)}var Z=g("ZodStringFormat",(e,n)=>{L.init(e,n),ji.init(e,n)}),Ue=g("ZodISODateTime",(e,n)=>{Ba.init(e,n),Z.init(e,n)}),Le=g("ZodISODate",(e,n)=>{Ma.init(e,n),Z.init(e,n)}),Ce=g("ZodISOTime",(e,n)=>{Fa.init(e,n),Z.init(e,n)}),Ze=g("ZodISODuration",(e,n)=>{Ja.init(e,n),Z.init(e,n)}),Ni=g("ZodEmail",(e,n)=>{Na.init(e,n),Z.init(e,n)});function lf(e){return Xr(Ni,e)}var Ei=g("ZodGUID",(e,n)=>{Oa.init(e,n),Z.init(e,n)});function df(e){return qr(Ei,e)}var $e=g("ZodUUID",(e,n)=>{ja.init(e,n),Z.init(e,n)});function pf(e){return Hr($e,e)}function ff(e){return Yr($e,e)}function mf(e){return Qr($e,e)}function gf(e){return ei($e,e)}var Tn=g("ZodURL",(e,n)=>{Ta.init(e,n),Z.init(e,n)});function vf(e){return In(Tn,e)}function hf(e){return In(Tn,{protocol:cn,hostname:Jo,...y.normalizeParams(e)})}var Di=g("ZodEmoji",(e,n)=>{Aa.init(e,n),Z.init(e,n)});function yf(e){return ti(Di,e)}var Ti=g("ZodNanoID",(e,n)=>{Ua.init(e,n),Z.init(e,n)});function bf(e){return ni(Ti,e)}var Ai=g("ZodCUID",(e,n)=>{La.init(e,n),Z.init(e,n)});function $f(e){return ri(Ai,e)}var Ui=g("ZodCUID2",(e,n)=>{Ca.init(e,n),Z.init(e,n)});function _f(e){return ii(Ui,e)}var Li=g("ZodULID",(e,n)=>{Za.init(e,n),Z.init(e,n)});function kf(e){return oi(Li,e)}var Ci=g("ZodXID",(e,n)=>{Ra.init(e,n),Z.init(e,n)});function xf(e){return ai(Ci,e)}var Zi=g("ZodKSUID",(e,n)=>{Va.init(e,n),Z.init(e,n)});function wf(e){return ci(Zi,e)}var Ri=g("ZodIPv4",(e,n)=>{Ka.init(e,n),Z.init(e,n)});function If(e){return ui(Ri,e)}var Ds=g("ZodMAC",(e,n)=>{Ga.init(e,n),Z.init(e,n)});function Sf(e){return Yc(Ds,e)}var Vi=g("ZodIPv6",(e,n)=>{Wa.init(e,n),Z.init(e,n)});function zf(e){return si(Vi,e)}var Bi=g("ZodCIDRv4",(e,n)=>{Xa.init(e,n),Z.init(e,n)});function Pf(e){return li(Bi,e)}var Mi=g("ZodCIDRv6",(e,n)=>{qa.init(e,n),Z.init(e,n)});function Of(e){return di(Mi,e)}var Fi=g("ZodBase64",(e,n)=>{Ha.init(e,n),Z.init(e,n)});function jf(e){return pi(Fi,e)}var Ji=g("ZodBase64URL",(e,n)=>{Ya.init(e,n),Z.init(e,n)});function Nf(e){return fi(Ji,e)}var Ki=g("ZodE164",(e,n)=>{Qa.init(e,n),Z.init(e,n)});function Ef(e){return mi(Ki,e)}var Ts=g("ZodCreditCard",(e,n)=>{ec.init(e,n),Z.init(e,n)});function Df(e){return Qc(Ts,e)}var As=g("ZodIBAN",(e,n)=>{tc.init(e,n),Z.init(e,n)});function Tf(e){return eu(As,e)}var Wi=g("ZodJWT",(e,n)=>{nc.init(e,n),Z.init(e,n)});function Af(e){return gi(Wi,e)}var it=g("ZodCustomStringFormat",(e,n)=>{rc.init(e,n),Z.init(e,n)});function Uf(e,n,i={}){return et(it,e,n,i)}function Lf(e){return et(it,"hostname",Fo,e)}function Cf(e){return et(it,"hex",oa,e)}function Zf(e){return et(it,"currency_code",Wo,e)}function Rf(e,n){let i=n?.enc??"hex",o=`${e}_${i}`,t=pe[o];if(!t)throw new Error(`Unrecognized hash format: ${o}`);return et(it,o,t,n)}var Vt=g("ZodNumber",(e,n)=>{jr.init(e,n),N.init(e,n),e._zod.processJSONSchema=(i,o,t)=>Cu(e,i,o,t),e.isFinite=!0},y.derived({minValue:e=>{let{minimum:n,exclusiveMinimum:i}=K(e);return Math.max(n??Number.NEGATIVE_INFINITY,i??Number.NEGATIVE_INFINITY)},maxValue:e=>{let{maximum:n,exclusiveMaximum:i}=K(e);return Math.min(n??Number.POSITIVE_INFINITY,i??Number.POSITIVE_INFINITY)},isInt:e=>{let{isInt:n,multipleOf:i}=K(e);return!!n||!!i?.some(Number.isSafeInteger)},format:e=>K(e).format??null},{gt(e,n){return this.check(ye(e,n))},gte(e,n){return this.check(se(e,n))},min(e,n){return this.check(se(e,n))},lt(e,n){return this.check(he(e,n))},lte(e,n){return this.check(ue(e,n))},max(e,n){return this.check(ue(e,n))},int(e){return this.check(Pi(e))},safe(e){return this.check(Pi(e))},positive(e){return this.check(ye(0,e))},nonnegative(e){return this.check(se(0,e))},negative(e){return this.check(he(0,e))},nonpositive(e){return this.check(ue(0,e))},multipleOf(e,n){return this.check(Ne(e,n))},step(e,n){return this.check(Ne(e,n))},finite(){return this}}));function Us(e){return nu(Vt,e)}var ot=g("ZodNumberFormat",(e,n)=>{ic.init(e,n),Vt.init(e,n)});function Pi(e){return iu(ot,e)}function Vf(e){return ou(ot,e)}function Bf(e){return au(ot,e)}function Mf(e){return cu(ot,e)}function Ff(e){return uu(ot,e)}var Bt=g("ZodBoolean",(e,n)=>{vn.init(e,n),N.init(e,n),e._zod.processJSONSchema=(i,o,t)=>Zu(e,i,o,t)});function Ls(e){return su(Bt,e)}var Mt=g("ZodBigInt",(e,n)=>{Nr.init(e,n),N.init(e,n),e._zod.processJSONSchema=(i,o,t)=>Ru(e,i,o,t)},y.derived({minValue:e=>K(e).minimum??null,maxValue:e=>K(e).maximum??null,format:e=>K(e).format??null},{gte(e,n){return this.check(se(e,n))},min(e,n){return this.check(se(e,n))},gt(e,n){return this.check(ye(e,n))},lt(e,n){return this.check(he(e,n))},lte(e,n){return this.check(ue(e,n))},max(e,n){return this.check(ue(e,n))},positive(e){return this.check(ye(BigInt(0),e))},negative(e){return this.check(he(BigInt(0),e))},nonpositive(e){return this.check(ue(BigInt(0),e))},nonnegative(e){return this.check(se(BigInt(0),e))},multipleOf(e,n){return this.check(Ne(e,n))}}));function Jf(e){return du(Mt,e)}var Gi=g("ZodBigIntFormat",(e,n)=>{oc.init(e,n),Mt.init(e,n)});function Kf(e){return fu(Gi,e)}function Wf(e){return mu(Gi,e)}var Cs=g("ZodSymbol",(e,n)=>{ac.init(e,n),N.init(e,n),e._zod.processJSONSchema=(i,o,t)=>Vu(e,i,o,t)});function Gf(e){return gu(Cs,e)}var Zs=g("ZodUndefined",(e,n)=>{cc.init(e,n),N.init(e,n),e._zod.processJSONSchema=(i,o,t)=>Mu(e,i,o,t)});function Xf(e){return vu(Zs,e)}var Rs=g("ZodNull",(e,n)=>{uc.init(e,n),N.init(e,n),e._zod.processJSONSchema=(i,o,t)=>Bu(e,i,o,t)});function Vs(e){return hu(Rs,e)}var Bs=g("ZodAny",(e,n)=>{sc.init(e,n),N.init(e,n),e._zod.processJSONSchema=(i,o,t)=>Ku(e,i,o,t)});function qf(){return yu(Bs)}var Ms=g("ZodUnknown",(e,n)=>{lc.init(e,n),N.init(e,n),e._zod.processJSONSchema=(i,o,t)=>Wu(e,i,o,t)});function tt(){return bu(Ms)}var Fs=g("ZodNever",(e,n)=>{dc.init(e,n),N.init(e,n),e._zod.processJSONSchema=(i,o,t)=>Ju(e,i,o,t)});function Xi(e){return $u(Fs,e)}var Js=g("ZodVoid",(e,n)=>{pc.init(e,n),N.init(e,n),e._zod.processJSONSchema=(i,o,t)=>Fu(e,i,o,t)});function Hf(e){return _u(Js,e)}var An=g("ZodDate",(e,n)=>{fc.init(e,n),N.init(e,n),e._zod.processJSONSchema=(i,o,t)=>Gu(e,i,o,t),e.min=(i,o)=>e.check(se(i,o)),e.max=(i,o)=>e.check(ue(i,o))},y.derived({minDate:e=>{let{minimum:n}=K(e);return n?new Date(n):null},maxDate:e=>{let{maximum:n}=K(e);return n?new Date(n):null}},{}));function Yf(e){return ku(An,e)}var Ks=g("ZodArray",(e,n)=>{rt(),mc.init(e,n),N.init(e,n),e._zod.processJSONSchema=(i,o,t)=>as(e,i,o,t),e.element=n.element},{min(e,n){return this.check(Ie(e,n))},nonempty(e){return this.check(Ie(1,e))},max(e,n){return this.check(Ye(e,n))},length(e,n){return this.check(Qe(e,n))},unwrap(){return this.element}});function Un(e,n){return Iu(Ks,e,n)}function Qf(e){let n=e._zod.def.shape;return qi(Object.keys(n))}var Ln=g("ZodObject",(e,n)=>{rt(),gc.init(e,n),N.init(e,n),e._zod.processJSONSchema=(i,o,t)=>cs(e,i,o,t),y.installLazyProp(e,"shape",i=>i._zod.def.shape,!1)},{keyof(){return qi(Object.keys(this._zod.def.shape))},catchall(e){return this.clone(y.mergeDefs(this._zod.def,{catchall:e}))},passthrough(){return this.clone(y.mergeDefs(this._zod.def,{catchall:tt()}))},loose(){return this.clone(y.mergeDefs(this._zod.def,{catchall:tt()}))},strict(){return this.clone(y.mergeDefs(this._zod.def,{catchall:Xi()}))},strip(){return this.clone(y.mergeDefs(this._zod.def,{catchall:void 0}))},extend(e){return y.extend(this,e)},safeExtend(e){return y.safeExtend(this,e)},merge(e){return y.merge(this,e)},pick(e){return y.pick(this,e)},omit(e){return y.omit(this,e)},partial(...e){return y.partial(Zn,this,e[0])},exactPartial(...e){return y.partial(Yi,this,e[0],"exactPartial")},required(...e){return y.required(Qi,this,e[0])}});function em(e,n){let i={type:"object",shape:e??{},...y.normalizeParams(n)};return new Ln(i)}function tm(e,n){return new Ln({type:"object",shape:e,catchall:Xi(),...y.normalizeParams(n)})}function nm(e,n){return new Ln({type:"object",shape:e,catchall:tt(),...y.normalizeParams(n)})}var Cn=g("ZodUnion",(e,n)=>{hn.init(e,n),N.init(e,n),e._zod.processJSONSchema=(i,o,t)=>ki(e,i,o,t),e.options=n.options});function Ft(e,n){return new Cn({type:"union",options:e,...y.normalizeParams(n)})}var Ws=g("ZodXor",(e,n)=>{Cn.init(e,n),vc.init(e,n),e._zod.processJSONSchema=(i,o,t)=>ki(e,i,o,t),e.options=n.options});function rm(e,n){return new Ws({type:"union",options:e,inclusive:!1,...y.normalizeParams(n)})}var Gs=g("ZodDiscriminatedUnion",(e,n)=>{Cn.init(e,n),yc.init(e,n)});function im(e,n,i){return new Gs({type:"union",options:n,discriminator:e,...y.normalizeParams(i)})}var Xs=g("ZodIntersection",(e,n)=>{bc.init(e,n),N.init(e,n),e._zod.processJSONSchema=(i,o,t)=>us(e,i,o,t)});function qs(e,n){return new Xs({type:"intersection",left:e,right:n})}var Hs=g("ZodTuple",(e,n)=>{rt(),Er.init(e,n),N.init(e,n),e._zod.processJSONSchema=(i,o,t)=>ss(e,i,o,t)},{rest(e){return this.clone({...this._zod.def,rest:e})},partial(){let e=this._zod.def;if(e.checks?.length)throw new Error(".partial() cannot be used on tuple schemas containing refinements");return this.clone({...e,items:e.items.map(n=>new Zn({type:"optional",innerType:n}))})}});function Ys(e,n,i){let o=n instanceof O,t=o?i:n,r=o?n:null;return new Hs({type:"tuple",items:e,rest:r,...y.normalizeParams(t)})}var Ct=g("ZodRecord",(e,n)=>{rt(),$c.init(e,n),N.init(e,n),e._zod.processJSONSchema=(i,o,t)=>ls(e,i,o,t),e.keyType=n.keyType,e.valueType=n.valueType});function Qs(e,n,i){return!n||!n._zod?new Ct({type:"record",keyType:En(),valueType:e,...y.normalizeParams(n)}):new Ct({type:"record",keyType:e,valueType:n,...y.normalizeParams(i)})}function om(e,n,i){return new Ct({type:"record",keyType:e,valueType:n,...y.normalizeParams(i),partial:!0})}function am(e,n,i){return new Ct({type:"record",keyType:e,valueType:n,mode:"loose",...y.normalizeParams(i)})}var el=g("ZodMap",(e,n)=>{rt(),_c.init(e,n),N.init(e,n),e._zod.processJSONSchema=(i,o,t)=>is(e,i,o,t),e.keyType=n.keyType,e.valueType=n.valueType,e.min=(...i)=>e.check(be(...i)),e.nonempty=i=>e.check(be(1,i)),e.max=(...i)=>e.check(Ee(...i)),e.size=(...i)=>e.check(He(...i))});function cm(e,n,i){return new el({type:"map",keyType:e,valueType:n,...y.normalizeParams(i)})}var tl=g("ZodSet",(e,n)=>{rt(),kc.init(e,n),N.init(e,n),e._zod.processJSONSchema=(i,o,t)=>os(e,i,o,t),e.min=(...i)=>e.check(be(...i)),e.nonempty=i=>e.check(be(1,i)),e.max=(...i)=>e.check(Ee(...i)),e.size=(...i)=>e.check(He(...i))});function um(e,n){return new tl({type:"set",valueType:e,...y.normalizeParams(n)})}var Zt=g("ZodEnum",(e,n)=>{xc.init(e,n),N.init(e,n),e._zod.processJSONSchema=(o,t,r)=>Xu(e,o,t,r),e.enum=n.entries,e.options=[...e._zod.values];let i=new Set(Object.keys(n.entries));e.extract=(o,t)=>{let r={};for(let a of o)if(i.has(a))r[a]=n.entries[a];else throw new Error(`Key ${a} not found in enum`);return new Zt({...n,checks:[],...y.normalizeParams(t),entries:r})},e.exclude=(o,t)=>{let r={...n.entries};for(let a of o)if(i.has(a))delete r[a];else throw new Error(`Key ${a} not found in enum`);return new Zt({...n,checks:[],...y.normalizeParams(t),entries:r})}});function qi(e,n){let i=Array.isArray(e)?Object.fromEntries(e.map(o=>[o,o])):e;return new Zt({type:"enum",entries:i,...y.normalizeParams(n)})}function sm(e,n){return new Zt({type:"enum",entries:e,...y.normalizeParams(n)})}var nl=g("ZodLiteral",(e,n)=>{wc.init(e,n),N.init(e,n),e._zod.processJSONSchema=(i,o,t)=>qu(e,i,o,t),e.values=new Set(n.values),Object.defineProperty(e,"value",{get(){if(n.values.length>1)throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");return n.values[0]}})});function lm(e,n){return new nl({type:"literal",values:Array.isArray(e)?e:[e],...y.normalizeParams(n)})}var rl=g("ZodFile",(e,n)=>{Ic.init(e,n),N.init(e,n),e._zod.processJSONSchema=(i,o,t)=>Qu(e,i,o,t),e.min=(i,o)=>e.check(be(i,o)),e.max=(i,o)=>e.check(Ee(i,o)),e.mime=(i,o)=>e.check(Ot(Array.isArray(i)?i:[i],o))});function dm(e){return Su(rl,e)}var il=g("ZodTransform",(e,n)=>{rt(),Sc.init(e,n),N.init(e,n),e._zod.processJSONSchema=(i,o,t)=>rs(e,i,o,t),e._zod.parse=(i,o)=>{if(o.direction==="backward")throw new je(e.constructor.name);i.addIssue=r=>{if(typeof r=="string")i.issues.push(y.issue(r,i.value,n));else{let a=r;a.fatal&&(a.continue=!1),a.code??(a.code="custom"),"input"in a||(a.input=i.value),a.inst??(a.inst=e),i.issues.push(y.issue(a))}};let t=n.transform(i.value,i);return t instanceof Promise?t.then(r=>(i.value=r,i)):(i.value=t,i)}});function Hi(e){return new il({type:"transform",transform:e})}var Zn=g("ZodOptional",(e,n)=>{Dr.init(e,n),N.init(e,n),e._zod.processJSONSchema=(i,o,t)=>xi(e,i,o,t),e.unwrap=()=>e._zod.def.innerType});function nt(e){return new Zn({type:"optional",innerType:e})}var Yi=g("ZodExactOptional",(e,n)=>{zc.init(e,n),N.init(e,n),e._zod.processJSONSchema=(i,o,t)=>xi(e,i,o,t),e.unwrap=()=>e._zod.def.innerType});function ol(e){return new Yi({type:"optional",innerType:e})}var al=g("ZodNullable",(e,n)=>{Pc.init(e,n),N.init(e,n),e._zod.processJSONSchema=(i,o,t)=>ds(e,i,o,t),e.unwrap=()=>e._zod.def.innerType});function Dn(e){return new al({type:"nullable",innerType:e})}function pm(e){return nt(Dn(e))}var cl=g("ZodDefault",(e,n)=>{Oc.init(e,n),N.init(e,n),e._zod.processJSONSchema=(i,o,t)=>ms(e,i,o,t),e.unwrap=()=>e._zod.def.innerType,e.removeDefault=e.unwrap});function ul(e,n){return new cl({type:"default",innerType:e,get defaultValue(){return typeof n=="function"?n():y.shallowClone(n)}})}var sl=g("ZodPrefault",(e,n)=>{jc.init(e,n),N.init(e,n),e._zod.processJSONSchema=(i,o,t)=>gs(e,i,o,t),e.unwrap=()=>e._zod.def.innerType});function ll(e,n){return new sl({type:"prefault",innerType:e,get defaultValue(){return typeof n=="function"?n():y.shallowClone(n)}})}var Qi=g("ZodNonOptional",(e,n)=>{Nc.init(e,n),N.init(e,n),e._zod.processJSONSchema=(i,o,t)=>ps(e,i,o,t),e.unwrap=()=>e._zod.def.innerType});function dl(e,n){return new Qi({type:"nonoptional",innerType:e,...y.normalizeParams(n)})}var pl=g("ZodSuccess",(e,n)=>{Ec.init(e,n),N.init(e,n),e._zod.processJSONSchema=(i,o,t)=>es(e,i,o,t),e.unwrap=()=>e._zod.def.innerType});function fm(e){return new pl({type:"success",innerType:e})}var fl=g("ZodCatch",(e,n)=>{Dc.init(e,n),N.init(e,n),e._zod.processJSONSchema=(i,o,t)=>vs(e,i,o,t),e.unwrap=()=>e._zod.def.innerType,e.removeCatch=e.unwrap});function ml(e,n){return new fl({type:"catch",innerType:e,catchValue:typeof n=="function"?n:y.constantCatch(n)})}var gl=g("ZodNaN",(e,n)=>{Tc.init(e,n),N.init(e,n),e._zod.processJSONSchema=(i,o,t)=>Hu(e,i,o,t)});function mm(e){return wu(gl,e)}var Rn=g("ZodPipe",(e,n)=>{Tr.init(e,n),N.init(e,n),e._zod.processJSONSchema=(i,o,t)=>hs(e,i,o,t),e.in=n.in,e.out=n.out});function Oi(e,n){return new Rn({type:"pipe",in:e,out:n})}var Vn=g("ZodCodec",(e,n)=>{Rn.init(e,n),yn.init(e,n)});function gm(e,n,i){return new Vn({type:"pipe",in:e,out:n,transform:i.decode,reverseTransform:i.encode})}function vm(e){let n=e._zod.def;return new Vn({type:"pipe",in:n.out,out:n.in,transform:n.reverseTransform,reverseTransform:n.transform})}var vl=g("ZodPreprocess",(e,n)=>{Rn.init(e,n),Ac.init(e,n)}),hl=g("ZodReadonly",(e,n)=>{Uc.init(e,n),N.init(e,n),e._zod.processJSONSchema=(i,o,t)=>ys(e,i,o,t),e.unwrap=()=>e._zod.def.innerType});function yl(e){return new hl({type:"readonly",innerType:e})}var bl=g("ZodTemplateLiteral",(e,n)=>{Lc.init(e,n),N.init(e,n),e._zod.processJSONSchema=(i,o,t)=>Yu(e,i,o,t)});function hm(e,n){return new bl({type:"template_literal",parts:e,...y.normalizeParams(n)})}var $l=g("ZodLazy",(e,n)=>{bn.init(e,n),N.init(e,n),e._zod.processJSONSchema=(i,o,t)=>$s(e,i,o,t),e.unwrap=()=>e._zod.def.getter()});function _l(e){return new $l({type:"lazy",getter:e})}var kl=g("ZodPromise",(e,n)=>{Zc.init(e,n),N.init(e,n),e._zod.processJSONSchema=(i,o,t)=>bs(e,i,o,t),e.unwrap=()=>e._zod.def.innerType});function ym(e){return new kl({type:"promise",innerType:e})}var xl=g("ZodFunction",(e,n)=>{Cc.init(e,n),N.init(e,n),e._zod.processJSONSchema=(i,o,t)=>ns(e,i,o,t)});function bm(e){return new xl({type:"function",input:Array.isArray(e?.input)?Ys(e?.input):e?.input??Un(tt()),output:e?.output??tt()})}var Bn=g("ZodCustom",(e,n)=>{Rc.init(e,n),N.init(e,n),e._zod.processJSONSchema=(i,o,t)=>ts(e,i,o,t)});function $m(e){let n=new R({check:"custom"});return n._zod.check=e,n}function _m(e,n){return zu(Bn,e??(()=>!0),n)}function wl(e,n={}){return Pu(Bn,e,n)}function Il(e,n){return Ou(e,n)}var km=ju,xm=Nu,Sl=g("ZodInstanceOf",(e,n)=>{Bn.init(e,n)},{properties(e,n){return this.check(Pt(e,n))}});function wm(e,n={}){let i=new Sl({type:"custom",check:"custom",fn:o=>o instanceof e,abort:!0,...y.normalizeParams(n)});return i._zod.bag.Class=e,i._zod.check=o=>{o.value instanceof e||o.issues.push({code:"invalid_type",expected:e.name,input:o.value,inst:i,path:[...i._zod.def.path??[]]})},i}var Im=(...e)=>Eu({Codec:Vn,Boolean:Bt,String:Rt},...e);function Sm(e){let n=_l(()=>Ft([En(e),Us(),Ls(),Vs(),Un(n),Qs(En(),n)]));return n}function zm(e,n){return new vl({type:"pipe",in:Hi(e),out:n})}var wb={invalid_type:"invalid_type",too_big:"too_big",too_small:"too_small",invalid_format:"invalid_format",not_multiple_of:"not_multiple_of",unrecognized_keys:"unrecognized_keys",invalid_union:"invalid_union",invalid_key:"invalid_key",invalid_element:"invalid_element",invalid_value:"invalid_value",custom:"custom"};function Ib(e){M({customError:e})}function Sb(){return M().customError}var zl;zl||(zl={});var Mn={};_e(Mn,{ZodISODate:()=>Le,ZodISODateTime:()=>Ue,ZodISODuration:()=>Ze,ZodISOTime:()=>Ce,date:()=>Pb,datetime:()=>zb,duration:()=>jb,time:()=>Ob});function zb(e){return Sn(Ue,e)}function Pb(e){return zn(Le,e)}function Ob(e){return Pn(Ce,e)}function jb(e){return On(Ze,e)}var w={...Jt,...Si,iso:Mn},Nb=new Set(["$schema","$ref","$defs","definitions","$id","id","$comment","$anchor","$vocabulary","$dynamicRef","$dynamicAnchor","type","enum","const","anyOf","oneOf","allOf","not","properties","required","additionalProperties","patternProperties","propertyNames","minProperties","maxProperties","items","prefixItems","additionalItems","minItems","maxItems","uniqueItems","contains","minContains","maxContains","minLength","maxLength","pattern","format","minimum","maximum","exclusiveMinimum","exclusiveMaximum","multipleOf","description","default","contentEncoding","contentMediaType","contentSchema","unevaluatedItems","unevaluatedProperties","if","then","else","dependentSchemas","dependentRequired","nullable","readOnly"]);function Eb(e,n){let i=e.$schema;return i==="https://json-schema.org/draft/2020-12/schema"?"draft-2020-12":i==="http://json-schema.org/draft-07/schema#"?"draft-7":i==="http://json-schema.org/draft-04/schema#"?"draft-4":n??"draft-2020-12"}function Pm(e,n){return e.map((i,o)=>o<n?i:i.optional())}function Db(e){return e.replace(/~1/g,"/").replace(/~0/g,"~")}function Tb(e,n){if(!e.startsWith("#"))throw new Error("External $ref is not supported, only local refs (#/...) are allowed");let i=e.slice(1).split("/").filter(Boolean);if(i.length===0)return n.rootSchema;let o=n.version==="draft-2020-12"?"$defs":"definitions";if(i[0]===o){let t=i[1]===void 0?void 0:Db(i[1]);if(!t||!n.defs[t])throw new Error(`Reference not found: ${e}`);return n.defs[t]}throw new Error(`Reference not found: ${e}`)}function Ab(e,n){return w.transform(o=>o).check(o=>{let t=o.value;if(typeof t!="object"||t===null||Array.isArray(t))return;let r=Object.getOwnPropertyNames(t);if(n.minProperties!==void 0&&r.length<n.minProperties&&o.issues.push({origin:"object",code:"too_small",minimum:n.minProperties,inclusive:!0,message:`Too small: expected object to have >=${n.minProperties} properties`,input:t,inst:e,continue:!0}),n.maxProperties!==void 0&&r.length>n.maxProperties&&o.issues.push({origin:"object",code:"too_big",maximum:n.maxProperties,inclusive:!0,message:`Too big: expected object to have <=${n.maxProperties} properties`,input:t,inst:e,continue:!0}),n.keySchema)for(let a of r){let c=n.keySchema.safeParse(a);c.success||o.issues.push({code:"invalid_key",origin:"record",issues:c.error.issues,input:a,path:[a],continue:!0})}}).pipe(e)}function Pl(e,n){if(e===null)return"z";let i=typeof e;if(i!=="object"){if(i==="number"&&Number.isNaN(e))return null;let o=String(e);return`${i[0]}${o.length}:${o}`}if(n.has(e))return null;n.add(e);try{if(Array.isArray(e)){let r=[];for(let a of e){let c=Pl(a,n);if(c===null)return null;r.push(c)}return`a${r.length}:[${r.join(",")}]`}let o=Object.keys(e).sort(),t=[];for(let r of o){let a=Pl(e[r],n);if(a===null)return null;t.push(`${r.length}:${r}=${a}`)}return`o${t.length}:{${t.join(",")}}`}finally{n.delete(e)}}var Ub=new Set(["items","prefixItems","additionalItems","additionalProperties","contains","propertyNames","not","if","then","else","allOf","anyOf","oneOf","unevaluatedItems","unevaluatedProperties","contentSchema"]),Lb=new Set(["properties","patternProperties","dependentSchemas","dependencies","$defs","definitions"]);function Fn(e){return typeof e!="object"||e===null?!1:Array.isArray(e)?e.some(Fn):typeof e.$ref=="string"?!0:Object.entries(e).some(([n,i])=>Ub.has(n)?Fn(i):!Lb.has(n)||typeof i!="object"||i===null?!1:Object.values(i).some(Fn))}function Om(e){return e===1?"element":"elements"}function Cb(e,n){return w.transform(o=>o).check(o=>{let t=o.value;if(Array.isArray(t)){if(n.uniqueItems===!0){let r=new Map;for(let a=0;a<t.length;a++){let c=Pl(t[a],new Set);if(c===null)continue;let u=r.get(c);if(u===void 0){r.set(c,a);continue}o.issues.push({code:"custom",message:`Array items must be unique: element at index ${a} duplicates the one at index ${u}`,input:t,path:[a],continue:!0})}}if(n.containsSchema){let r=n.minContains??1,a=n.maxContains!==void 0?n.maxContains+1:Number.POSITIVE_INFINITY,c=0;for(let u of t)if(n.containsSchema.safeParse(u).success&&++c>=a)break;c<r&&o.issues.push({code:"custom",message:`Array must contain at least ${r} matching ${Om(r)}; found ${c}`,input:t,continue:!0}),n.maxContains!==void 0&&c>n.maxContains&&o.issues.push({code:"custom",message:`Array must contain at most ${n.maxContains} matching ${Om(n.maxContains)}`,input:t,continue:!0})}}}).pipe(e)}function jm(e,n){if(e!==!1)return e===void 0||e===!0?w.any():ne(e,n)}var Zb=/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;function Nm(e,n){if(e.not!==void 0){if(typeof e.not=="object"&&Object.keys(e.not).length===0)return w.never();throw new Error("not is not supported in Zod (except { not: {} } for never)")}if(e.unevaluatedItems!==void 0)throw new Error("unevaluatedItems is not supported");if(e.unevaluatedProperties!==void 0)throw new Error("unevaluatedProperties is not supported");if(e.if!==void 0||e.then!==void 0||e.else!==void 0)throw new Error("Conditional schemas (if/then/else) are not supported");if(e.dependentSchemas!==void 0||e.dependentRequired!==void 0)throw new Error("dependentSchemas and dependentRequired are not supported");if(e.$ref){let t=e.$ref;if(n.refs.has(t))return n.refs.get(t);if(n.processing.has(t))return w.lazy(()=>{if(!n.refs.has(t))throw new Error(`Circular reference not resolved: ${t}`);return n.refs.get(t)});n.processing.add(t);let r=Tb(t,n),a=ne(r,n);return n.refs.set(t,a),n.processing.delete(t),a}if(e.enum!==void 0){let t=e.enum;if(n.version==="openapi-3.0"&&e.nullable===!0&&t.length===1&&t[0]===null)return w.null();if(t.length===0)return w.never();if(t.length===1)return w.literal(t[0]);if(t.every(a=>typeof a=="string"))return w.enum(t);let r=t.map(a=>w.literal(a));return r.length<2?r[0]:w.union([r[0],r[1],...r.slice(2)])}if(e.const!==void 0)return w.literal(e.const);let i=e.type;if(Array.isArray(i)){let t=i.map(r=>{let a={...e,type:r};return Nm(a,n)});return t.length===0?w.never():t.length===1?t[0]:w.union(t)}if(!i)return w.any();let o;switch(i){case"string":{let t=w.string();if(e.format){let r=e.format;r==="email"?t=t.check(w.email()):r==="uri"||r==="uri-reference"?t=t.check(w.url()):r==="uuid"||r==="guid"?t=t.check(w.uuid()):r==="date-time"?t=t.check(w.iso.datetime({offset:!0})):r==="date"?t=t.check(w.iso.date()):r==="time"?t=t.check(w.regex(Zb)):r==="duration"?t=t.check(w.iso.duration()):r==="hostname"?t=t.check(w.hostname()):r==="ipv4"?t=t.check(w.ipv4()):r==="ipv6"?t=t.check(w.ipv6()):r==="mac"?t=t.check(w.mac()):r==="cidr"?t=t.check(w.cidrv4()):r==="cidr-v6"?t=t.check(w.cidrv6()):r==="base64"?t=t.check(w.base64()):r==="base64url"?t=t.check(w.base64url()):r==="e164"?t=t.check(w.e164()):r==="credit_card"?t=t.check(w.creditCard()):r==="iban"?t=t.check(w.iban()):r==="jwt"?t=t.check(w.jwt()):r==="emoji"?t=t.check(w.emoji()):r==="nanoid"?t=t.check(w.nanoid()):r==="cuid"?t=t.check(w.cuid()):r==="cuid2"?t=t.check(w.cuid2()):r==="ulid"?t=t.check(w.ulid()):r==="xid"?t=t.check(w.xid()):r==="ksuid"&&(t=t.check(w.ksuid()))}typeof e.minLength=="number"&&(t=t.min(e.minLength)),typeof e.maxLength=="number"&&(t=t.max(e.maxLength)),e.pattern&&(t=t.regex(new RegExp(e.pattern))),o=t;break}case"number":case"integer":{let t=i==="integer"?w.number().int():w.number();typeof e.minimum=="number"&&e.exclusiveMinimum!==!0&&(t=t.min(e.minimum)),typeof e.maximum=="number"&&e.exclusiveMaximum!==!0&&(t=t.max(e.maximum)),typeof e.exclusiveMinimum=="number"?t=t.gt(e.exclusiveMinimum):e.exclusiveMinimum===!0&&typeof e.minimum=="number"&&(t=t.gt(e.minimum)),typeof e.exclusiveMaximum=="number"?t=t.lt(e.exclusiveMaximum):e.exclusiveMaximum===!0&&typeof e.maximum=="number"&&(t=t.lt(e.maximum)),typeof e.multipleOf=="number"&&(t=t.multipleOf(e.multipleOf)),o=t;break}case"boolean":{o=w.boolean();break}case"null":{o=w.null();break}case"object":{let t={},r=e.properties||{},a=new Set(e.required||[]),c=typeof e.additionalProperties=="object"?ne(e.additionalProperties,n):void 0;for(let[p,f]of Object.entries(r)){let m=ne(f,n);G(t,p,a.has(p)?m:m.optional())}if(e.patternProperties){let p=e.patternProperties,f=Object.keys(p),m=[];for(let _ of f){let x=ne(p[_],n),z=w.string().regex(new RegExp(_));m.push(w.looseRecord(z,x))}let h=[];if(Object.keys(t).length>0&&h.push(w.object(t).passthrough()),h.push(...m),h.length===0)o=w.object({}).passthrough();else if(h.length===1)o=h[0];else{let _=w.intersection(h[0],h[1]);for(let x=2;x<h.length;x++)_=w.intersection(_,h[x]);o=_}if(e.additionalProperties===!1){let _=Object.keys(t),x=f.map(I=>new RegExp(I)),z=o;o=o.check(I=>{if(!le(I.value))return;let j=[];for(let A of Object.keys(I.value))_.includes(A)||x.some(V=>V.test(A))||j.push(A);j.length&&I.issues.push({code:"unrecognized_keys",keys:j,input:I.value,inst:z})})}}else{let p=w.object(t);e.additionalProperties===!1?o=p.strict():c?o=p.catchall(c):o=p.passthrough()}let u=e.propertyNames!==void 0&&e.propertyNames!==!0,s=typeof e.minProperties=="number"?e.minProperties:void 0,l=typeof e.maxProperties=="number"?e.maxProperties:void 0;if(u||s!==void 0||l!==void 0){let p;if(u){let f=typeof e.propertyNames=="object"&&e.propertyNames.type===void 0?{type:"string",...e.propertyNames}:e.propertyNames;p=ne(f,n)}o=Ab(o,{keySchema:p,minProperties:s,maxProperties:l})}break}case"array":{let t=e.prefixItems,r=e.items;if(t&&Array.isArray(t)){let a=typeof e.minItems=="number"?e.minItems:0,c=t.map(p=>ne(p,n)),u=Pm(c,a),s=Array.isArray(r)?void 0:jm(r,n),l=w.tuple(u);o=s?l.rest(s):l,typeof e.minItems=="number"&&(o=o.check(w.minLength(e.minItems))),typeof e.maxItems=="number"&&(o=o.check(w.maxLength(e.maxItems)))}else if(Array.isArray(r)){let a=typeof e.minItems=="number"?e.minItems:0,c=r.map(p=>ne(p,n)),u=Pm(c,a),s=jm(e.additionalItems,n),l=w.tuple(u);o=s?l.rest(s):l,typeof e.minItems=="number"&&(o=o.check(w.minLength(e.minItems))),typeof e.maxItems=="number"&&(o=o.check(w.maxLength(e.maxItems)))}else if(r!==void 0){let a=ne(r,n),c=w.array(a);typeof e.minItems=="number"&&(c=c.min(e.minItems)),typeof e.maxItems=="number"&&(c=c.max(e.maxItems)),o=c}else o=w.array(w.any());(e.uniqueItems===!0||e.contains!==void 0)&&(o=Cb(o,{uniqueItems:e.uniqueItems===!0,containsSchema:e.contains!==void 0?ne(e.contains,n):void 0,minContains:typeof e.minContains=="number"?e.minContains:void 0,maxContains:typeof e.maxContains=="number"?e.maxContains:void 0}));break}default:throw new Error(`Unsupported type: ${i}`)}return o}function ne(e,n){if(typeof e=="boolean")return e?w.any():w.never();let i=Nm(e,n),o=e.type||e.enum!==void 0||e.const!==void 0;if(e.anyOf&&Array.isArray(e.anyOf)){let c=e.anyOf.map(s=>ne(s,n)),u=w.union(c);i=o?w.intersection(i,u):u}if(e.oneOf&&Array.isArray(e.oneOf)){let c=e.oneOf.map(s=>ne(s,n)),u=w.xor(c);i=o?w.intersection(i,u):u}if(e.allOf&&Array.isArray(e.allOf))if(e.allOf.length===0)i=o?i:w.any();else{let c=o?i:ne(e.allOf[0],n),u=o?0:1;for(let s=u;s<e.allOf.length;s++)c=w.intersection(c,ne(e.allOf[s],n));i=c}e.nullable===!0&&n.version==="openapi-3.0"&&(i=w.nullable(i)),e.readOnly===!0&&(i=w.readonly(i)),e.default!==void 0&&(i=i.default(e.default));let t={},r=["$id","id","$comment","$anchor","$vocabulary","$dynamicRef","$dynamicAnchor"];for(let c of r)c in e&&(t[c]=e[c]);let a=["contentEncoding","contentMediaType","contentSchema"];for(let c of a)c in e&&(t[c]=e[c]);if(e.type==="object"&&e.$ref===void 0){e.propertyNames!==void 0&&!Fn(e.propertyNames)&&(t.propertyNames=e.propertyNames);for(let c of["minProperties","maxProperties"])e[c]!==void 0&&(t[c]=e[c])}if(e.type==="array"&&e.$ref===void 0){e.contains!==void 0&&!Fn(e.contains)&&(t.contains=e.contains);for(let c of["uniqueItems","minContains","maxContains"])e[c]!==void 0&&(t[c]=e[c])}for(let c of Object.keys(e))Nb.has(c)||G(t,c,e[c]);return Object.keys(t).length>0&&n.registry.add(i,t),e.description&&(i=i.describe(e.description)),i}function Em(e,n){if(typeof e=="boolean")return e?w.any():w.never();let i;try{i=JSON.parse(JSON.stringify(e))}catch{throw new Error("fromJSONSchema input is not valid JSON (possibly cyclic); use $defs/$ref for recursive schemas")}let o=Eb(i,n?.defaultTarget),t=i.$defs||i.definitions||{},r={version:o,defs:t,refs:new Map,processing:new Set,rootSchema:i,registry:n?.registry??X};return ne(i,r)}var Dm=Symbol("z.visit/resolving");function Jn(e,n){let i=typeof n=="function"?n:(a,c)=>{let u=n[a._zod.def.type];return u?u(a,c):a},o=new Map;function t(a){let c=o.get(a);if(c===Dm)return new bn({type:"lazy",getter:()=>o.get(a)});if(c!==void 0)return c;o.set(a,Dm);let u=r(a),s=i(u,u!==a);return o.set(a,s),s}function r(a){let c=a._zod.def,u=c.type;switch(u){case"object":{let s=c.shape,l=Object.keys(s),p=!1,f={};for(let h of l){let _=t(s[h]);_!==s[h]&&(p=!0),f[h]=_}let m=c.catchall;return c.catchall&&(m=t(c.catchall),m!==c.catchall&&(p=!0)),p?U(a,{...c,shape:f,catchall:m}):a}case"array":{let s=t(c.element);return s===c.element?a:U(a,{...c,element:s})}case"tuple":{let s=c.items,l=!1,p=[];for(let m of s){let h=t(m);h!==m&&(l=!0),p.push(h)}let f=c.rest;return c.rest&&(f=t(c.rest),f!==c.rest&&(l=!0)),l?U(a,{...c,items:p,rest:f}):a}case"record":case"map":{let s=t(c.keyType),l=t(c.valueType);return s===c.keyType&&l===c.valueType?a:U(a,{...c,keyType:s,valueType:l})}case"set":{let s=t(c.valueType);return s===c.valueType?a:U(a,{...c,valueType:s})}case"union":{let s=c.options,l=!1,p=[];for(let f of s){let m=t(f);m!==f&&(l=!0),p.push(m)}return l?U(a,{...c,options:p}):a}case"intersection":{let s=t(c.left),l=t(c.right);return s===c.left&&l===c.right?a:U(a,{...c,left:s,right:l})}case"optional":case"nullable":case"default":case"prefault":case"catch":case"readonly":case"nonoptional":case"promise":case"success":{let s=t(c.innerType);return s===c.innerType?a:U(a,{...c,innerType:s})}case"pipe":{let s=t(c.in),l=t(c.out);return s===c.in&&l===c.out?a:U(a,{...c,in:s,out:l})}case"function":{let s=t(c.input),l=t(c.output);return s===c.input&&l===c.output?a:U(a,{...c,input:s,output:l})}case"lazy":{let s=c.getter,{_cachedInner:l,...p}=c;return U(a,{...p,getter:()=>t(s())})}case"template_literal":case"string":case"number":case"int":case"boolean":case"bigint":case"symbol":case"undefined":case"null":case"void":case"never":case"any":case"unknown":case"date":case"nan":case"enum":case"literal":case"file":case"transform":case"custom":return a;default:return a}}return t(e)}function Tm(e){return Jn(e,{object:n=>n.partial(),union:n=>{let i=n._zod.def;return i.discriminator===void 0?n:Ft(i.options)}})}function Rb(e,n){if(!n?.length)return e;let i=e._zod.def;return U(e,fe(i,{checks:[...i.checks??[],...n]}),{parent:!0})}function Am(e){return Rb(e.out,e.checks)}function Vb(e){return e.in._zod.traits.has("$ZodTransform")?Am(e):e.in}function Um(e){return Jn(e,{pipe:n=>Vb(n._zod.def),default:(n,i)=>i?nt(n._zod.def.innerType):n,catch:(n,i)=>i?n._zod.def.innerType:n})}function Lm(e){return Jn(e,{pipe:n=>Am(n._zod.def),prefault:(n,i)=>i?n._zod.def.innerType:n})}var Ol={};_e(Ol,{bigint:()=>Jb,boolean:()=>Fb,date:()=>Kb,number:()=>Mb,string:()=>Bb});function Bb(e){return Hc(Rt,e)}function Mb(e){return ru(Vt,e)}function Fb(e){return lu(Bt,e)}function Jb(e){return pu(Mt,e)}function Kb(e){return xu(An,e)}var Cm=d.object({name:d.string().min(1),discord:d.string().prefault("")}),Zm=d.enum(["dungeon","event","mechanism","build","persona"]),jl={dungeon:"副本",event:"事件",mechanism:"机制拓展",build:"构筑",persona:"人设"},Wb=d.union([d.literal(""),d.string().regex(/^https?:\/\/[^\s"'<>\\]+$/,"封面须是 http(s) 图片链接，且不含空白/引号/尖括号")]),ve=d.object({format:d.literal("wxhl-mod@2"),id:d.string().min(1),name:d.string().min(1),type:Zm,version:d.string().regex(/^\d+\.\d+\.\d+$/,"版本号须为 x.y.z"),author:Cm,tags:d.array(d.string()).prefault([]),description:d.string().min(1,"需要一句话简介（列表卡片要显示）"),cover:Wb.prefault(""),requires:d.object({cardVersion:d.string().prefault("")}).prefault({})});var Kn=d.object({分类:d.string().prefault("基础"),类型:d.string().prefault("主动"),行动类型:d.string().prefault("主要行动"),关联属性:d.string().prefault(""),消耗:d.string().prefault(""),冷却:d.string().prefault(""),射程:d.string().prefault(""),目标:d.string().prefault(""),阶位:d.string().prefault(""),属性要求:d.string().prefault(""),等级:d.coerce.number().prefault(1),效果:d.record(d.string(),d.any()).prefault({})}).catchall(d.any()).prefault({}),Re=d.object({名称:d.string().prefault("无"),类型:d.string().prefault("无"),品质:d.string().prefault("无"),阶位:d.string().prefault("无"),穿戴门槛:d.string().prefault("无"),强化等级:d.coerce.number().prefault(0),伤害骰:d.string().prefault("无"),倍率:d.coerce.number().prefault(0),主属性:d.string().prefault("无"),副属性:d.string().prefault("无"),主属性加成:d.coerce.number().prefault(0),副属性加成:d.coerce.number().prefault(0),装备防御:d.coerce.number().prefault(0),装备闪避:d.coerce.number().prefault(0),负重:d.coerce.number().prefault(0),效果:d.record(d.string(),d.string()).prefault({}),描述:d.string().prefault("无"),数量:d.coerce.number().prefault(1)}).prefault({}),Vm=d.object({主武器:Re,副武器:Re,头部:Re,躯干:Re,手部:Re,下装:Re,饰品:Re}).prefault({}),Rm=d.object({名称:d.string().prefault("无"),品质:d.string().prefault("无"),属性加成:d.string().prefault("无"),效果:d.record(d.string(),d.string()).prefault({})}).prefault({}),Gb=d.object({详细内容:d.string().prefault("无"),效果:d.string().prefault("无"),主属性加成:d.object({属性:d.string().prefault("无"),值:d.coerce.number().prefault(0)}).prefault({}),副属性加成:d.object({属性:d.string().prefault("无"),值:d.coerce.number().prefault(0)}).prefault({}),职业特性:d.record(d.string(),d.union([d.string(),d.record(d.string(),d.any())])).prefault({}),职业技能:d.record(d.string(),Kn).prefault({})}).prefault({}),Bm=d.union([d.enum(["未解锁","未选择","当前","已完成","跳过","已放弃"]),d.string()]).prefault("未选择"),Mm=d.lazy(()=>d.object({状态:Bm,详情:Gb,分支:d.record(d.string(),Mm).prefault({})}).prefault({})),Xb=d.object({名称:d.string().prefault("无"),状态:Bm,分支:d.record(d.string(),Mm).prefault({})}).prefault({}),qb=d.object({主属性:d.enum(["STR","AGI","CON","PER"]).prefault("STR"),副属性:d.enum(["STR","AGI","CON","PER","无"]).prefault("无")}).prefault({}),Hb=d.object({名称:d.string().prefault("无"),稀有度:d.string().prefault("无"),转职阶段:d.string().prefault("基础"),职业等级:d.coerce.number().prefault(0),PEXP_当前:d.coerce.number().prefault(0),PEXP_升级所需:d.coerce.number().prefault(0),主属性加成:d.object({属性:d.string().prefault("无"),值:d.coerce.number().prefault(0)}).prefault({}),副属性加成:d.object({属性:d.string().prefault("无"),值:d.coerce.number().prefault(0)}).prefault({}),职业简介:d.string().prefault("无").describe("职业的简短介绍、机制方向与发展定位"),职业技能:d.record(d.string(),Kn).prefault({}),职业特性:d.record(d.string(),d.union([d.string(),d.record(d.string(),d.any())])).prefault({}),传承技能:d.record(d.string(),Kn).prefault({}),转职树:Xb}).catchall(d.any()).prefault({}),eo=d.object({构筑名:d.string().min(1),定位:d.string().min(1).describe("战术流派/小队定位一句话"),等级:d.coerce.number().int().min(1).prefault(1),阶位:d.string().prefault("一阶"),属性基础:d.object({STR:d.coerce.number().prefault(5),AGI:d.coerce.number().prefault(5),CON:d.coerce.number().prefault(5),PER:d.coerce.number().prefault(5)}).prefault({}),属性分配方向:qb,天赋:Rm,血统:Rm,称号:d.object({名称:d.string().prefault("无"),效果:d.record(d.string(),d.string()).prefault({})}).prefault({}),职业:Hb,通用技能:d.record(d.string(),Kn).prefault({}),主要装备:Vm,背包建议:d.record(d.string(),d.object({描述:d.string().prefault(""),数量:d.coerce.number().prefault(1)}).catchall(d.any())).prefault({})}),Nl=ve.extend({type:d.literal("build"),build:eo});var at=d.object({name:d.string().min(1).describe("条目名"),content:d.string().min(1).describe("条目正文"),enabled:d.boolean().prefault(!0),constant:d.boolean().prefault(!1).describe("true=蓝灯常驻；false=绿灯按关键词激活"),keys:d.array(d.string().min(1)).prefault([]).describe("绿灯主关键词"),keysSecondary:d.array(d.string().min(1)).prefault([]),position:d.enum(["before_char","after_char","at_depth"]).prefault("after_char"),depth:d.coerce.number().int().min(0).prefault(0),order:d.coerce.number().int().prefault(100),probability:d.coerce.number().min(0).max(100).prefault(100),sticky:d.coerce.number().int().min(0).nullable().prefault(null),cooldown:d.coerce.number().int().min(0).nullable().prefault(null),delay:d.coerce.number().int().min(0).nullable().prefault(null),preventRecursion:d.boolean().prefault(!1),excludeRecursion:d.boolean().prefault(!1)}).refine(e=>e.constant||e.keys.length>0,{message:"绿灯条目至少需要一个主关键词（或设 constant: true 为蓝灯）"});var to=d.object({名称:d.string().min(1),说明:d.string().min(1),奖励:d.string().prefault("")}),Yb=d.object({名称:d.string().min(1),说明:d.string().min(1),难度:d.string().prefault(""),奖励:d.string().prefault("")}),El=ve.extend({type:d.literal("dungeon"),副本名称:d.string().min(1),副本类型:d.enum(["和平","阵营","血腥"]),基准等级:d.coerce.number().int().min(1).prefault(1),时间限制:d.string().prefault("未指定"),背景设定:d.string().min(1),地图与区域:d.string().min(1),敌人配置:d.string().min(1),主线任务:to,支线任务:d.array(to).prefault([]),世界事件:d.array(to).prefault([]),隐藏任务:d.array(to).prefault([]),成就:d.array(Yb).prefault([]),GM指导:d.string().min(1,"GM 指导不能为空（主持话术与判定口径）"),额外条目:d.array(at).prefault([])});var Fm=d.object({名称:d.string().regex(/^EJS\//,"控制器条目名必须以 EJS/ 开头"),正文:d.string().min(1).describe("EJS 模板正文，用 getwi('事件_…') 挑事件")}),Dl=ve.extend({type:d.literal("event"),事件条目:d.array(at).min(1,"事件包至少要有一条事件条目").refine(e=>e.every(n=>n.name.startsWith("事件_")),{message:"事件条目名必须以 事件_ 开头（推荐 事件_<包名>_<事件名>，避免与其他包撞名）"}),控制器条目:Fm.optional()});var Tl=ve.extend({type:d.literal("mechanism"),条目:d.array(at).min(1,"机制拓展至少要有一条世界书条目")});var Jm=d.object({角色名:d.string().min(1),外观:d.object({外貌:d.string().prefault(""),衣着:d.string().prefault(""),装备幻化:d.string().prefault("")}).prefault({}),性格:d.string().prefault(""),爱好:d.array(d.string()).prefault([]),厌恶:d.array(d.string()).prefault([]),背景故事:d.string().min(1),构筑方向:d.string().prefault("").describe("自由文本：粗浅写构筑思路即可"),构筑:eo.optional().describe("可选：粘贴一份完整构筑")}),Al=ve.extend({type:d.literal("persona"),persona:Jm});var Km=d.discriminatedUnion("type",[El,Dl,Tl,Nl,Al]);var Wm=`<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>回廊创意工坊</title>
<style>
  :root {
    --bg: #0f172a;
    --bg-2: #1e293b;
    --bg-3: #172033;
    --line: #334155;
    --text: #e2e8f0;
    --muted: #94a3b8;
    --accent: #38bdf8;
    --accent-strong: #0ea5e9;
    --danger: #f87171;
    --warn-bg: #422006;
    --warn-line: #b45309;
    --warn-text: #fcd34d;
    /* 五类徽章色：副本血红 / 事件琥珀 / 机制青蓝 / 构筑紫 / 人设金 */
    --dungeon: #fca5a5;   --dungeon-bg: rgba(239, 68, 68, .16);   --dungeon-line: rgba(239, 68, 68, .42);
    --event: #fcd34d;     --event-bg: rgba(245, 158, 11, .16);    --event-line: rgba(245, 158, 11, .42);
    --mechanism: #67e8f9; --mechanism-bg: rgba(34, 211, 238, .16); --mechanism-line: rgba(34, 211, 238, .42);
    --build: #c4b5fd;     --build-bg: rgba(167, 139, 250, .18);   --build-line: rgba(167, 139, 250, .42);
    --persona: #fbbf24;   --persona-bg: rgba(251, 191, 36, .16);  --persona-line: rgba(251, 191, 36, .42);
    --radius: 10px;
  }
  * { box-sizing: border-box; }
  [hidden] { display: none !important; }
  html, body { margin: 0; padding: 0; }
  body {
    min-width: 320px;
    background: var(--bg);
    color: var(--text);
    font-family: system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    font-size: 14px;
    line-height: 1.5;
  }
  h1, h2, h3 { font-weight: 600; }
  input, select, textarea, button { font: inherit; color: inherit; }
  input[type=text], input[type=search], input[type=number], input[type=password], select, textarea {
    background: var(--bg-2); border: 1px solid var(--line); border-radius: 8px;
    padding: 7px 10px; width: 100%; color: var(--text);
  }
  input:focus, select:focus, textarea:focus { outline: none; border-color: var(--accent); }
  textarea { resize: vertical; }
  button {
    background: var(--bg-2); border: 1px solid var(--line); border-radius: 8px;
    padding: 7px 14px; cursor: pointer; white-space: nowrap;
  }
  button:hover:not(:disabled) { border-color: var(--accent); }
  button:disabled { opacity: .45; cursor: not-allowed; }
  button.primary { background: var(--accent-strong); border-color: var(--accent-strong); color: #04222f; font-weight: 600; }
  button.primary:hover:not(:disabled) { filter: brightness(1.08); }
  button.danger { background: transparent; border-color: var(--danger); color: var(--danger); }
  button.ghost { background: transparent; border-color: transparent; color: var(--muted); }
  button.small { padding: 3px 10px; font-size: 12px; }

  /* 顶栏 */
  #topbar {
    position: sticky; top: 0; z-index: 20;
    padding: 10px 16px max(10px, env(safe-area-inset-bottom, 0px));
    padding-top: calc(10px + env(safe-area-inset-top, 0px));
    background: rgba(15, 23, 42, .96);
    border-bottom: 1px solid var(--line);
    backdrop-filter: blur(6px);
  }
  .topbar-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  #topbar h1 { font-size: 18px; margin: 0 6px 0 0; white-space: nowrap; }
  #search { flex: 1 1 180px; min-width: 120px; }
  .type-nav { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .type-btn { padding: 5px 12px; border-radius: 999px; font-size: 13px; }
  .type-btn.active { background: var(--accent-strong); border-color: var(--accent-strong); color: #04222f; font-weight: 600; }

  /* 桥状态条 */
  #bridgeBanner {
    margin: 12px 16px 0; padding: 10px 14px; border-radius: 8px;
    background: var(--warn-bg); border: 1px solid var(--warn-line); color: var(--warn-text);
    font-size: 13px;
  }

  /* 列表 */
  #grid {
    display: grid; gap: 12px; padding: 16px;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }
  .card {
    background: var(--bg-2); border: 1px solid var(--line); border-radius: var(--radius);
    padding: 12px; cursor: pointer; display: flex; flex-direction: column; gap: 8px;
    transition: border-color .15s;
  }
  .card:hover { border-color: var(--accent); }
  .card:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
  .card-cover { position: relative; aspect-ratio: 5 / 3; background: var(--bg-3); border-radius: 8px; overflow: hidden; }
  .card-cover img { width: 100%; height: 100%; object-fit: contain; display: block; }
  .card-badge { position: absolute; top: 8px; right: 8px; }
  .card-name { margin: 0; font-size: 15px; word-break: break-word; }
  .card-desc {
    margin: 0; color: #cbd5e1; font-size: 13px; word-break: break-word;
    display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
  .card-foot { display: flex; justify-content: space-between; gap: 8px; margin-top: auto; color: var(--muted); font-size: 12px; }
  .card-author { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .center-note { text-align: center; color: var(--muted); padding: 32px 16px; }
  #loadMore { display: block; margin: 4px auto 28px; }

  /* 徽章 */
  .badge { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 12px; white-space: nowrap; border: 1px solid transparent; }
  .badge-dungeon   { color: var(--dungeon);   background: var(--dungeon-bg);   border-color: var(--dungeon-line); }
  .badge-event     { color: var(--event);     background: var(--event-bg);     border-color: var(--event-line); }
  .badge-mechanism { color: var(--mechanism); background: var(--mechanism-bg); border-color: var(--mechanism-line); }
  .badge-build     { color: var(--build);     background: var(--build-bg);     border-color: var(--build-line); }
  .badge-persona   { color: var(--persona);   background: var(--persona-bg);   border-color: var(--persona-line); }

  /* 视图 */
  #uploadView { max-width: 880px; margin: 0 auto; padding: 16px; }
  .view-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
  .view-head h2 { margin: 0; font-size: 17px; }
  #detailView.overlay { padding: 24px 16px; }
  #detailView .card-box { max-width: 880px; margin: 0 auto; }
  /* 详情顶部返回行吸顶：长内容滚到底也能返回 */
  #detailView .row-between { position: sticky; top: 0; background: var(--bg-2); z-index: 1; padding: 4px 0; }

  /* 详情 */
  .detail-cover { aspect-ratio: 16 / 7; background: var(--bg-3); border-radius: 10px; overflow: hidden; margin-bottom: 12px; }
  .detail-cover img { width: 100%; height: 100%; object-fit: contain; display: block; }
  .detail-head { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .detail-name { margin: 0; font-size: 20px; word-break: break-word; }
  .detail-meta { color: var(--muted); font-size: 13px; margin-top: 4px; }
  .detail-desc { white-space: pre-wrap; margin: 10px 0; word-break: break-word; }
  .tag-row { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
  .tag { background: var(--bg-3); border: 1px solid var(--line); border-radius: 999px; padding: 1px 8px; font-size: 12px; color: var(--muted); }
  .preview-entry { background: var(--bg-2); border: 1px solid var(--line); border-radius: 8px; padding: 10px; margin: 8px 0; }
  .preview-name { font-weight: 600; margin-bottom: 4px; word-break: break-word; }
  .preview-content { white-space: pre-wrap; color: #cbd5e1; word-break: break-word; margin: 0; }
  .actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--line); }
  .install-state { color: var(--muted); margin-right: auto; }
  .hint { color: var(--muted); font-size: 12px; }
  .status-line { white-space: pre-wrap; overflow-wrap: anywhere; margin: 4px 0 0; }
  .error-text { color: var(--danger); font-size: 13px; }
  .loading, .empty { color: var(--muted); padding: 24px 0; }

  /* 编辑状态横幅（上传视图顶部） */
  .edit-banner {
    margin-bottom: 12px; padding: 10px 14px; border-radius: 8px;
    background: var(--warn-bg); border: 1px solid var(--warn-line); color: var(--warn-text);
    font-size: 13px;
  }
  /* 管理密钥输入框：放在按钮行里，需要自适应宽度而不是 width:100%
     （写成 input.key-input 是为了压过上面 input[type=password] 的特异性） */
  input.key-input { flex: 1 1 200px; width: auto; min-width: 140px; }
  /* 管理员面板里的一行（密钥 + 按钮） */
  .panel-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 10px 0; }
  /* 面板行内右侧的操作按钮组（无边框，区别于详情页的 .actions） */
  .row-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }

  /* 上传表单 */
  .form { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 6px; }
  .field { display: flex; flex-direction: column; gap: 4px; }
  .field-label { color: var(--muted); font-size: 12px; }
  .full { grid-column: 1 / -1; }
  label.check { flex-direction: row; align-items: center; gap: 8px; }
  label.check input { width: auto; }
  .entry-row {
    background: var(--bg-2); border: 1px solid var(--line); border-radius: 8px;
    padding: 12px; margin: 10px 0; display: grid; gap: 10px;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }
  .entry-head { grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center; }
  .entry-index { color: var(--muted); font-size: 12px; }
  .section-title { margin: 18px 0 6px; font-size: 15px; }
  .row-between { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
  .type-section { margin-bottom: 8px; }
  #uploadView .actions { border-top: 1px solid var(--line); margin-top: 18px; }

  /* 弹层 */
  /* 滚动安全写法：块级 + overflow-y auto（flex 居中会让长内容上溢被裁且滚不到顶） */
  .overlay {
    position: fixed; inset: 0; z-index: 50;
    overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain;
    background: rgba(2, 6, 23, .82);
    padding: 16px;
  }
  .card-box { background: var(--bg-2); border: 1px solid var(--line); border-radius: 12px; padding: 20px; max-width: 540px; width: 100%; margin: 0 auto; }
  #agreement .card-box { border-color: var(--warn-line); }
  .card-box h2 { margin: 0 0 10px; font-size: 18px; }
  .agreement-text { color: #cbd5e1; margin: 0 0 14px; }
  .agreement-text strong { color: var(--warn-text); }
  .key-value {
    font-family: ui-monospace, Consolas, "Courier New", monospace;
    background: #0b1220; border: 1px solid var(--line); border-radius: 8px;
    padding: 10px; margin: 0 0 12px; word-break: break-all; white-space: pre-wrap; font-size: 13px;
  }

  /* 提示 */
  .toast {
    position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 80;
    background: var(--bg-2); border: 1px solid var(--line); color: var(--text);
    padding: 10px 16px; border-radius: 8px; max-width: 90vw;
    box-shadow: 0 8px 24px rgba(0, 0, 0, .45);
  }
  .toast.error { border-color: var(--danger); color: #fecaca; }

  @media (max-width: 480px) {
    #topbar h1 { flex-basis: 100%; margin-right: 0; }
    #search { flex-basis: 100%; }
    #grid { grid-template-columns: 1fr; padding: 12px; }
    #uploadView { padding: 12px; }
    .form, .entry-row { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>

  <!-- 1. 免责声明 -->
  <div id="agreement" class="overlay" hidden>
    <div class="card-box">
      <h2>免责声明</h2>
      <p class="agreement-text">内容包均由玩家自行上传、<strong>未经审核</strong>；安装第三方内容可能与角色卡冲突或影响游戏体验，请自行判断风险。安装前请确认你信任该内容包的作者。</p>
      <button id="agreeBtn" class="primary">我已了解，进入工坊</button>
    </div>
  </div>

  <!-- 2. 顶栏：标题 + 五类并列分类按钮 + 搜索 + 上传 -->
  <header id="topbar">
    <div class="topbar-row">
      <h1>回廊创意工坊</h1>
      <input id="search" type="search" placeholder="搜索名称 / 简介 / 作者">
      <button id="adminBtn">管理</button>
      <button id="uploadBtn" class="primary">上传</button>
    </div>
    <nav id="typeNav" class="type-nav" aria-label="分类"></nav>
  </header>

  <!-- 3. 桥状态条 -->
  <div id="bridgeBanner" hidden>⚠️ 未检测到宿主脚本——请从酒馆内的「创意工坊」按钮打开本页面</div>

  <!-- 4. 列表视图 -->
  <main id="listView" class="view">
    <div id="grid"></div>
    <div id="listEmpty" class="center-note" hidden>没有找到内容包</div>
    <button id="loadMore" hidden>加载更多</button>
  </main>

  <!-- 5. 详情弹层 -->
  <div id="detailView" class="overlay" hidden>
    <div class="card-box">
      <div class="row-between">
        <button id="detailBack" class="ghost">← 返回列表</button>
      </div>
      <div id="detailBody"></div>
    </div>
  </div>

  <!-- 6. 上传视图 -->
  <section id="uploadView" class="view" hidden>
    <div class="view-head"><button id="uploadBack" class="ghost">← 返回列表</button><h2>上传内容包</h2></div>
    <div id="uploadBanner" class="edit-banner" hidden></div>
    <nav id="uploadTypeNav" class="type-nav" aria-label="上传类型"></nav>
    <div class="form">
      <label class="field"><span class="field-label">名称 *</span><input id="upName" type="text"></label>
      <label class="field"><span class="field-label">版本 *</span><input id="upVersion" type="text" value="1.0.0"></label>
      <label class="field"><span class="field-label">作者名 *</span><input id="upAuthor" type="text"></label>
      <label class="field"><span class="field-label">Discord（选填）</span><input id="upDiscord" type="text"></label>
      <label class="field"><span class="field-label">标签（逗号分隔）</span><input id="upTags" type="text"></label>
      <label class="field full"><span class="field-label">封面图 URL（选填）</span><input id="upCover" type="text" placeholder="https://…/cover.png"></label>
      <label class="field full"><span class="field-label">简介 *（列表卡片显示）</span><textarea id="upDesc" rows="3"></textarea></label>
    </div>

    <div id="uploadSections"></div>

    <div class="actions">
      <button id="upSubmit" class="primary">提交</button>
      <span id="upError" class="error-text"></span>
    </div>
  </section>

  <!-- 管理密钥弹层 -->
  <div id="keyModal" class="overlay" hidden>
    <div class="card-box">
      <h2>保存你的管理密钥</h2>
      <p class="agreement-text">这是你的管理密钥，只显示这一次，请立即保存。凭它更新或下架本包。</p>
      <pre id="keyValue" class="key-value"></pre>
      <div class="actions">
        <button id="keyCopy" class="primary">复制</button>
        <button id="keyDetail">查看详情</button>
        <button id="keyClose" class="ghost">返回列表</button>
      </div>
    </div>
  </div>

  <!-- 管理员面板（纯 HTTP，不依赖宿主桥） -->
  <div id="adminView" class="overlay" hidden>
    <div class="card-box">
      <h2>管理员面板</h2>
      <div class="panel-row">
        <input id="adminKey" type="password" class="key-input" placeholder="管理员密钥" autocomplete="off">
        <button id="adminLoadBtn" class="primary">载入列表</button>
      </div>
      <p id="adminError" class="error-text"></p>
      <div id="adminList"></div>
      <div id="adminResult"></div>
      <div class="panel-row">
        <button id="adminClose" class="ghost">关闭</button>
      </div>
    </div>
  </div>

  <!-- 通用提示 -->
  <div id="toast" class="toast" hidden></div>

<script type="module">
import * as W from '/page-lib.js';

// ==================== 常量与状态 ====================
const PAGE_SIZE = 20;
const ENTRY_PAGE_SIZE = 20; // 条目编辑器每页渲染 20 条
const PROBE_TIMEOUT_MS = 4000;

const CATEGORIES = [
  { value: '', label: '全部' },
  { value: 'dungeon', label: W.PACK_TYPE_LABEL.dungeon },
  { value: 'event', label: W.PACK_TYPE_LABEL.event },
  { value: 'mechanism', label: W.PACK_TYPE_LABEL.mechanism },
  { value: 'build', label: W.PACK_TYPE_LABEL.build },
  { value: 'persona', label: W.PACK_TYPE_LABEL.persona },
];

const $ = selector => document.querySelector(selector);

const state = {
  bridgeOk: false,
  q: '',
  type: '',
  offset: 0,
  limit: PAGE_SIZE,
  packs: [],
  total: 0,
  loading: false,
  draftId: '',
  uploadType: 'dungeon',
  currentDetailId: '',
  metaById: new Map(),
  // 编辑态：{ id, name, version, key } —— 非空表示上传视图正在改一个已存在的包（提交走 update）
  editing: null,
};

const bridge = W.createBridgeClient({ parentWindow: window.parent, selfWindow: window });

// ==================== 通用小工具 ====================
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function button(label, className, onClick) {
  const node = el('button', className, label);
  if (onClick) node.addEventListener('click', onClick);
  return node;
}

function field(labelText, control, extraClass) {
  const wrap = el('label', 'field' + (extraClass ? ' ' + extraClass : ''));
  wrap.append(el('span', 'field-label', labelText));
  wrap.append(control);
  return wrap;
}

function textInput(placeholder) {
  const input = document.createElement('input');
  input.type = 'text';
  if (placeholder) input.placeholder = placeholder;
  return input;
}

function textArea(rows, placeholder) {
  const area = document.createElement('textarea');
  area.rows = rows;
  if (placeholder) area.placeholder = placeholder;
  return area;
}

function numberInput(value) {
  const input = document.createElement('input');
  input.type = 'number';
  if (value !== undefined && value !== null) input.value = String(value);
  return input;
}

function selectInput(options, value) {
  const select = document.createElement('select');
  for (const [optionValue, label] of options) {
    const option = document.createElement('option');
    option.value = optionValue;
    option.textContent = label;
    select.append(option);
  }
  if (value !== undefined) select.value = value;
  return select;
}

function truncate(value, max) {
  const text = String(value ?? '');
  return text.length > max ? text.slice(0, max) + '…' : text;
}

function splitList(value) {
  return String(value ?? '')
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);
}

function intOr(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function numOr(value, fallback) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

function nullableInt(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

function parseJsonObject(text, label) {
  const raw = String(text ?? '').trim();
  if (!raw) return {};
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(\`\${label} 不是合法 JSON：\${error.message}\`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(\`\${label} 必须是 JSON 对象\`);
  }
  return parsed;
}

function formatTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso ?? '');
  const pad = n => String(n).padStart(2, '0');
  return \`\${d.getFullYear()}-\${pad(d.getMonth() + 1)}-\${pad(d.getDate())} \${pad(d.getHours())}:\${pad(d.getMinutes())}\`;
}

let toastTimer = 0;
function toast(message, isError) {
  const node = $('#toast');
  node.textContent = message;
  node.classList.toggle('error', !!isError);
  node.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { node.hidden = true; }, 3500);
}

function showListView() {
  setEditMode(null); // 离开上传视图 = 放弃编辑态
  $('#detailView').hidden = true;
  $('#uploadView').hidden = true;
  $('#listView').hidden = false;
  window.scrollTo(0, 0);
}

function showUploadView() {
  $('#detailView').hidden = true;
  $('#uploadView').hidden = false;
  $('#listView').hidden = true;
  window.scrollTo(0, 0);
}

// ==================== 编辑态与「记住密钥」 ====================
function manageKeyStorageKey(id) {
  return \`wxhl_cygf_key_\${id}\`;
}

function readSavedKey(id) {
  try {
    return localStorage.getItem(manageKeyStorageKey(id)) ?? '';
  } catch {
    return ''; // 隐私模式下读不到就当没存过
  }
}

function saveSavedKey(id, key) {
  try {
    if (key) localStorage.setItem(manageKeyStorageKey(id), key);
    else localStorage.removeItem(manageKeyStorageKey(id));
  } catch {
    /* 隐私模式下写不进也放行 */
  }
}

/** 进入 / 退出编辑态：锁死类型、显示横幅、改提交按钮文案 */
function setEditMode(editing) {
  state.editing = editing;
  for (const btn of $('#uploadTypeNav').__buttons ?? []) btn.disabled = !!editing;
  const banner = $('#uploadBanner');
  if (editing) {
    banner.textContent = \`正在编辑：\${editing.name}（v\${editing.version}）\`;
    banner.hidden = false;
    $('#upSubmit').textContent = '保存修改';
  } else {
    banner.textContent = '';
    banner.hidden = true;
    $('#upSubmit').textContent = '提交';
  }
}

/** 把上传表单清回「新建」状态（打开新建 / 打开编辑前都先走一遍） */
function resetUploadForm() {
  state.draftId = genId();
  $('#upName').value = '';
  $('#upVersion').value = '1.0.0';
  $('#upAuthor').value = '';
  $('#upDiscord').value = '';
  $('#upTags').value = '';
  $('#upCover').value = '';
  $('#upDesc').value = '';
  $('#upError').textContent = '';
  for (const section of Object.values(SECTIONS)) section.reset();
}

// ==================== 封面：一律走 img.src + onerror 回退占位 ====================
function coverImage(cover, className) {
  const img = document.createElement('img');
  if (className) img.className = className;
  img.alt = '';
  img.loading = 'lazy';
    // no-referrer：部分图床（如百度贴吧）会按 Referer 拒绝外链，浏览器不带 Referer 时能取到
    img.referrerPolicy = 'no-referrer';
    img.src = W.coverOrPlaceholder(cover);
  img.addEventListener('error', () => {
    if (img.src !== W.COVER_PLACEHOLDER) img.src = W.COVER_PLACEHOLDER;
  });
  return img;
}

// ==================== 1. 免责声明 ====================
function initAgreement() {
  let accepted = false;
  try {
    accepted = W.isAgreementAccepted(localStorage);
  } catch {
    accepted = false;
  }
  const gate = $('#agreement');
  gate.hidden = accepted;
  $('#agreeBtn').addEventListener('click', () => {
    try {
      W.acceptAgreement(localStorage);
    } catch {
      /* 隐私模式下写不进也放行 */
    }
    gate.hidden = true;
  });
}

// ==================== 3. 桥状态 ====================
function setBridgeUp() {
  state.bridgeOk = true;
  $('#bridgeBanner').hidden = true;
  if (state.currentDetailId && !$('#detailView').hidden) openDetail(state.currentDetailId);
}

function setBridgeDown() {
  state.bridgeOk = false;
  $('#bridgeBanner').hidden = false;
  if (state.currentDetailId && !$('#detailView').hidden) openDetail(state.currentDetailId);
}

function probeBridge() {
  let settled = false;
  const timer = setTimeout(() => {
    if (!settled) setBridgeDown();
  }, PROBE_TIMEOUT_MS);
  bridge
    .request('getContext')
    .then(() => {
      settled = true;
      clearTimeout(timer);
      setBridgeUp();
    })
    .catch(() => {
      settled = true;
      clearTimeout(timer);
      setBridgeDown();
    });
}

// ==================== 2. 分类导航 ====================
function renderTypeNav() {
  const nav = $('#typeNav');
  const buttons = [];
  for (const category of CATEGORIES) {
    const btn = button(category.label, 'type-btn');
    btn.dataset.value = category.value;
    btn.addEventListener('click', () => {
      state.type = category.value;
      for (const other of buttons) other.classList.toggle('active', other.dataset.value === state.type);
      loadList({ reset: true }); // 点击分类即筛选并回到第一页
    });
    buttons.push(btn);
    nav.append(btn);
  }
  for (const btn of buttons) btn.classList.toggle('active', btn.dataset.value === state.type);
}

// ==================== 4. 列表 ====================
function typeBadge(type) {
  const label = W.PACK_TYPE_LABEL[type] ?? type;
  return el('span', \`badge badge-\${type}\`, label);
}

function renderCard(meta) {
  const card = el('article', 'card');
  card.tabIndex = 0;

  const cover = el('div', 'card-cover');
  cover.append(coverImage(meta.cover));
  const badge = typeBadge(meta.type);
  badge.classList.add('card-badge');
  cover.append(badge);
  card.append(cover);

  card.append(el('h3', 'card-name', meta.name));
  card.append(el('p', 'card-desc', meta.description || '（无简介）'));

  const foot = el('div', 'card-foot');
  foot.append(el('span', 'card-author', \`@\${meta.authorName ?? '匿名'}\`));
  foot.append(el('span', null, \`⬇ \${meta.downloads ?? 0}\`));
  card.append(foot);

  const open = () => openDetail(meta.id);
  card.addEventListener('click', open);
  card.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      open();
    }
  });
  return card;
}

function renderGrid() {
  $('#grid').replaceChildren(...state.packs.map(renderCard));
  $('#listEmpty').hidden = state.packs.length > 0;
  $('#loadMore').hidden = state.packs.length >= state.total;
}

async function loadList({ reset } = {}) {
  if (state.loading) return;
  state.loading = true;
  if (reset) {
    state.offset = 0;
    state.packs = [];
  }
  try {
    const res = await W.api.list({ q: state.q, type: state.type, limit: state.limit, offset: state.offset });
    state.total = res.total ?? 0;
    const page = res.packs ?? [];
    state.packs = reset ? page : state.packs.concat(page);
    for (const meta of page) state.metaById.set(meta.id, meta);
    state.offset = state.packs.length;
    renderGrid();
  } catch (error) {
    toast('列表加载失败：' + error.message, true);
  } finally {
    state.loading = false;
  }
}

// ==================== 5. 详情弹层 ====================
function renderPreview(pack) {
  const box = el('div');
  let entries;
  try {
    entries = W.packToWorldbookEntries(pack);
  } catch {
    entries = null;
  }
  if (!entries) {
    box.append(el('p', 'hint', '无法渲染预览'));
    return box;
  }
  if (entries.length === 0) {
    box.append(el('p', 'hint', '（无条目）'));
    return box;
  }
  for (const entry of entries) {
    const item = el('div', 'preview-entry');
    item.append(el('div', 'preview-name', entry.name ?? ''));
    item.append(el('div', 'preview-content', truncate(entry.content ?? '', 200)));
    box.append(item);
  }
  return box;
}

/** 把构筑/人设写进存档（走宿主 applyBuild：扮演改构筑字段，其余写实体表） */
function doApply(pack, target, 类型) {
  const payload = pack.type === 'build' ? pack.build : pack.persona;
  const 名字 = String(payload?.构筑名 || payload?.角色名 || pack.name || '').trim();
  const 外貌 = String(payload?.外貌 || '').trim();
  const build = pack.type === 'build' ? payload : payload?.构筑 ?? payload;
  const 提示 =
    target === '扮演'
      ? '将把你当前契约者的「构筑字段」（等级/阶位/天赋/血统/称号/四维属性/职业/通用技能/装备）替换为「' + 名字 + '」。\\n\\n经济、背包、人际关系、副本经历、小队与其他契约者都会保留。\\n\\n确定继续吗？'
      : '将把「' + 名字 + '」写进你的存档：' + target + '（类型：' + (target === '副本角色' ? 类型 : target === '队友' ? '小队成员' : '其他契约者') + '）。\\n\\n同名的会被覆盖。确定继续吗？';
  if (!window.confirm(提示)) return;
  toast('正在写入存档…');
  bridge
    .request('applyBuild', { target, name: 名字, 外貌, 外观: payload?.外观, 类型, build })
    .then(res => toast('已写入：' + ((res && res.written) || []).join('、')))
    .catch(error => toast((error && error.message) || String(error), true));
}

function renderActions(pack, installed) {
  const box = el('div', 'actions');

  if (!state.bridgeOk) {
    box.append(el('div', 'install-state', '未连接宿主脚本'));
    const install = button('安装', 'primary');
    const uninstall = button('卸载', 'danger');
    install.disabled = true;
    uninstall.disabled = true;
    box.append(install, uninstall);
    box.append(el('div', 'hint', '请从酒馆内的「创意工坊」按钮打开本页面后再安装或卸载'));
    return box;
  }

  let label = '安装';
  if (installed) {
    if (installed.version === pack.version) {
      box.append(el('div', 'install-state', \`已安装 v\${installed.version}\`));
      label = '重新安装';
    } else {
      box.append(el('div', 'install-state', \`已安装 v\${installed.version}，有新版 v\${pack.version}\`));
      label = '更新';
    }
  } else {
    box.append(el('div', 'install-state', '未安装'));
  }

  box.append(button(label, 'primary', () => doInstall(pack.id)));
  if (installed) box.append(button('卸载', 'danger', () => doUninstall(pack.id)));

  // 构筑/人设还能「写进存档」：扮演（覆盖构筑字段）/ 队友 / 副本角色 / 其他契约者
  if (pack.type === 'build' || pack.type === 'persona') {
    const row = el('div', 'actions');
    const 类型Sel = selectInput(
      ['杂兵', '精英', 'BOSS', '隐藏BOSS', '精英（固有角色）', 'BOSS（固有角色）', '隐藏BOSS（固有角色）'].map(t => [t, t]),
      '杂兵',
    );
    row.append(el('div', 'install-state', '写到我的存档：'));
    row.append(button('扮演', 'primary', () => doApply(pack, '扮演', 类型Sel.value)));
    row.append(button('作为队友', 'btn', () => doApply(pack, '队友', 类型Sel.value)));
    row.append(button('作为副本角色', 'btn', () => doApply(pack, '副本角色', 类型Sel.value)));
    row.append(button('作为其他契约者', 'btn', () => doApply(pack, '其他契约者', 类型Sel.value)));
    row.append(field('副本角色·类型', 类型Sel));
    box.append(row);
    box.append(el('div', 'hint', '「扮演」只替换你契约者的构筑字段（等级/阶位/天赋/血统/称号/四维/职业/通用技能/装备），经济·背包·人际关系·副本经历等都保留。'));
  }
  return box;
}

// ==================== 5. 详情：管理区（编辑 / 下架 + 记住密钥） ====================
function renderManage(pack) {
  const box = el('div', 'actions');

  const keyInput = document.createElement('input');
  keyInput.type = 'password';
  keyInput.className = 'key-input';
  keyInput.placeholder = '上传时保存的管理密钥';
  keyInput.autocomplete = 'off';
  keyInput.value = readSavedKey(pack.id); // 存过就回填

  const remember = document.createElement('input');
  remember.type = 'checkbox';
  remember.checked = !!keyInput.value;

  const persist = () => saveSavedKey(pack.id, remember.checked ? keyInput.value.trim() : '');
  remember.addEventListener('change', persist);
  // 勾着「记住」时改密钥就地更新，免得填了却忘了再点一次勾选
  keyInput.addEventListener('input', () => { if (remember.checked) persist(); });

  const rememberWrap = el('label', 'field check');
  rememberWrap.append(remember, el('span', 'field-label', '记住密钥'));

  const editBtn = button('编辑此包', null, () => {
    const key = keyInput.value.trim();
    if (!key) {
      toast('请先填写管理密钥', true);
      return;
    }
    openEdit(pack, key);
  });

  const removeBtn = button('下架此包', 'danger', async () => {
    const key = keyInput.value.trim();
    if (!key) {
      toast('请先填写管理密钥', true);
      return;
    }
    if (!window.confirm(\`确定下架「\${pack.name}」吗？此操作不可撤销。\`)) return;
    removeBtn.disabled = true;
    try {
      await W.api.remove(pack.id, key);
      saveSavedKey(pack.id, ''); // 包都没了，密钥留着没意义
      toast('已下架');
      showListView();
      loadList({ reset: true });
    } catch (error) {
      toast(error.message, true); // 服务端原文；403 = 密钥不对或没有
      if (error.status === 403) {
        saveSavedKey(pack.id, '');
        remember.checked = false;
      }
    } finally {
      removeBtn.disabled = false;
    }
  });

  box.append(el('span', 'hint', '管理：'), keyInput, editBtn, removeBtn, rememberWrap);
  box.append(el('div', 'hint', '密钥只存在本机浏览器；「下架」用服务端密钥校验，成功即删除，无法恢复。'));
  return box;
}

/** 打开编辑：取回完整包 → 切到上传视图 → 锁定类型并预填 → 标记编辑态 */
async function openEdit(pack, key) {
  let res;
  try {
    res = await W.api.get(pack.id); // 列表只有元数据，编辑要完整包
  } catch (error) {
    toast('读取内容包失败：' + error.message, true);
    return;
  }
  const full = res.pack;
  resetUploadForm();
  setEditMode(null); // 先退出可能残留的编辑态，否则下面的 setUploadType 会被锁死挡掉
  state.draftId = full.id;
  setUploadType(full.type);
  $('#upName').value = full.name ?? '';
  $('#upVersion').value = full.version ?? '1.0.0';
  $('#upAuthor').value = full.author?.name ?? '';
  $('#upDiscord').value = full.author?.discord ?? '';
  $('#upTags').value = (full.tags ?? []).join(', ');
  $('#upCover').value = full.cover ?? '';
  $('#upDesc').value = full.description ?? '';
  const section = SECTIONS[full.type];
  if (typeof section?.fill === 'function') section.fill(full);
  setEditMode({ id: full.id, name: full.name, version: full.version, key });
  showUploadView();
}

function renderDetail(pack, installed) {
  const body = $('#detailBody');
  body.replaceChildren();

  const cover = el('div', 'detail-cover');
  cover.append(coverImage(pack.cover));
  body.append(cover);

  const head = el('div', 'detail-head');
  head.append(el('h2', 'detail-name', pack.name));
  head.append(typeBadge(pack.type));
  body.append(head);

  const author = pack.author ?? {};
  body.append(el('div', 'detail-meta', \`作者：\${author.name ?? ''}\${author.discord ? \`（Discord: \${author.discord}）\` : ''}\`));
  body.append(el('div', 'detail-meta', \`版本：v\${pack.version ?? ''}\`));
  const meta = state.metaById.get(pack.id);
  if (meta) body.append(el('div', 'detail-meta', \`下载数：\${meta.downloads ?? 0}\`));

  if (Array.isArray(pack.tags) && pack.tags.length) {
    const tagRow = el('div', 'tag-row');
    for (const tag of pack.tags) tagRow.append(el('span', 'tag', tag));
    body.append(tagRow);
  }

  body.append(el('p', 'detail-desc', pack.description || '（无简介）'));

  body.append(el('h3', 'section-title', '落地预览（写入世界书的条目）'));
  body.append(renderPreview(pack));
  body.append(renderActions(pack, installed));
  body.append(renderManage(pack));
}

async function readInstalled(id) {
  if (!state.bridgeOk) return null;
  try {
    const res = await bridge.request('getEntries', { worldbookName: W.WORKSHOP_WORLDBOOK });
    return W.computeInstalled(res?.entries ?? []).get(id) ?? null;
  } catch {
    return null;
  }
}

async function openDetail(id) {
  state.currentDetailId = id;
  $('#detailView').hidden = false;
  const body = $('#detailBody');
  body.replaceChildren(el('div', 'loading', '加载中…'));
  try {
    const res = await W.api.get(id);
    const pack = res.pack;
    const installed = await readInstalled(id);
    renderDetail(pack, installed);
  } catch (error) {
    body.replaceChildren(el('div', 'error-text', '加载失败：' + error.message));
  }
}

async function doInstall(id) {
  try {
    const res = await W.api.get(id);
    const pack = res.pack;
    const entries = W.packToWorldbookEntries(pack);
    const sourceMeta = W.sourceMetaOf(pack);
    const out = await bridge.request('upsertWorkshopEntries', {
      worldbookName: W.WORKSHOP_WORLDBOOK,
      sourceMeta,
      entries,
    });
    toast(\`已安装 \${out.installed} 条\`);
    await openDetail(id);
  } catch (error) {
    toast('安装失败：' + error.message, true);
  }
}

async function doUninstall(id) {
  try {
    const out = await bridge.request('deleteWorkshopEntries', {
      worldbookName: W.WORKSHOP_WORLDBOOK,
      sourceMeta: { sourceId: id },
    });
    if (out.removed === 0) toast('没有找到该内容包的条目');
    else toast(\`已移除 \${out.removed} 条\`);
    await openDetail(id);
  } catch (error) {
    toast('卸载失败：' + error.message, true);
  }
}

// ==================== 6. 上传：条目编辑器（世界书导入 + 逐条编辑 + 分页） ====================
function newEntry() {
  return {
    name: '',
    content: '',
    enabled: true,
    constant: false,
    keys: '',
    keysSecondary: '',
    position: 'after_char',
    depth: '0',
    order: '100',
    probability: '100',
    preventRecursion: false,
    excludeRecursion: false,
    sticky: '',
    cooldown: '',
    delay: '',
  };
}

/** 世界书条目 → 编辑器草稿：数值转字符串、关键词数组转逗号文本，并保留原数组防重新解析破坏正则/逗号 */
function entryToDraft(entry) {
  return {
    ...entry,
    keys: entry.keys.join(', '),
    keysSecondary: entry.keysSecondary.join(', '),
    importedKeys: [...entry.keys],
    importedKeysSecondary: [...entry.keysSecondary],
    depth: String(entry.depth),
    order: String(entry.order),
    probability: String(entry.probability),
    sticky: entry.sticky === null ? '' : String(entry.sticky),
    cooldown: entry.cooldown === null ? '' : String(entry.cooldown),
    delay: entry.delay === null ? '' : String(entry.delay),
  };
}

function buildEntryObject(draft) {
  return {
    name: draft.name.trim(),
    content: draft.content,
    enabled: draft.enabled !== false,
    constant: !!draft.constant,
    keys: draft.importedKeys ? [...draft.importedKeys] : splitList(draft.keys),
    keysSecondary: draft.importedKeysSecondary ? [...draft.importedKeysSecondary] : splitList(draft.keysSecondary),
    position: draft.position || 'after_char',
    depth: intOr(draft.depth, 0),
    order: intOr(draft.order, 100),
    probability: numOr(draft.probability, 100),
    preventRecursion: !!draft.preventRecursion,
    excludeRecursion: !!draft.excludeRecursion,
    sticky: nullableInt(draft.sticky),
    cooldown: nullableInt(draft.cooldown),
    delay: nullableInt(draft.delay),
  };
}

const CHECK_LABEL = {
  enabled: '启用此条目',
  constant: '蓝灯常驻（不靠关键词）',
  preventRecursion: '防止递归（prevent incoming）',
  excludeRecursion: '排除递归（prevent outgoing）',
};

function draftCheckbox(draft, key) {
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = !!draft[key];
  input.addEventListener('change', () => { draft[key] = input.checked; });
  const wrap = el('label', 'field check');
  wrap.append(input);
  wrap.append(el('span', 'field-label', CHECK_LABEL[key] ?? key));
  return wrap;
}

function draftTextInput(draft, key) {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = draft[key] ?? '';
  input.addEventListener('input', () => {
    draft[key] = input.value;
    if (key === 'keys') delete draft.importedKeys; // 改过输入框 → 按逗号重新解析
    if (key === 'keysSecondary') delete draft.importedKeysSecondary;
  });
  return input;
}

function draftTextarea(draft, key, rows) {
  const area = document.createElement('textarea');
  area.rows = rows;
  area.value = draft[key] ?? '';
  area.addEventListener('input', () => { draft[key] = area.value; });
  return area;
}

function draftPositionSelect(draft) {
  const select = selectInput(
    [
      ['after_char', '角色定义后'],
      ['before_char', '角色定义前'],
      ['at_depth', '指定深度'],
    ],
    draft.position || 'after_char',
  );
  select.addEventListener('change', () => { draft.position = select.value; });
  return select;
}

function createEntryEditor({ listEl, pagerEl, prevBtn, nextBtn, pageInfo, addBtn, fileInput, statusEl }) {
  let drafts = [];
  let page = 0;
  let busy = false;
  let revision = 0;

  function entryRow(draft, index) {
    const row = el('div', 'entry-row');
    const head = el('div', 'entry-head');
    head.append(el('span', 'entry-index', \`条目 \${index + 1}\`));
    head.append(
      button('删除', 'danger small', () => {
        drafts.splice(index, 1);
        if (drafts.length === 0) drafts.push(newEntry());
        render();
      }),
    );
    row.append(head);

    row.append(field('名称', draftTextInput(draft, 'name')));
    row.append(field('正文', draftTextarea(draft, 'content', 4), 'full'));
    row.append(draftCheckbox(draft, 'enabled'));
    row.append(draftCheckbox(draft, 'constant'));
    if (draft.importedKeys || draft.importedKeysSecondary) {
      row.append(el('p', 'hint', '原关键词已完整保留；修改关键词输入框后，将按逗号分隔重新解析。'));
    }
    row.append(field('绿灯关键词（逗号分隔）', draftTextInput(draft, 'keys')));
    row.append(field('次要关键词（逗号分隔）', draftTextInput(draft, 'keysSecondary')));
    row.append(field('插入位置', draftPositionSelect(draft)));
    row.append(field('depth', draftTextInput(draft, 'depth')));
    row.append(field('order', draftTextInput(draft, 'order')));
    row.append(field('概率（0-100）', draftTextInput(draft, 'probability')));
    row.append(draftCheckbox(draft, 'preventRecursion'));
    row.append(draftCheckbox(draft, 'excludeRecursion'));
    row.append(field('sticky（留空为无）', draftTextInput(draft, 'sticky')));
    row.append(field('cooldown（留空为无）', draftTextInput(draft, 'cooldown')));
    row.append(field('delay（留空为无）', draftTextInput(draft, 'delay')));
    return row;
  }

  function render() {
    const pages = Math.max(1, Math.ceil(drafts.length / ENTRY_PAGE_SIZE));
    page = Math.min(Math.max(0, page), pages - 1);
    const start = page * ENTRY_PAGE_SIZE;
    listEl.replaceChildren(...drafts.slice(start, start + ENTRY_PAGE_SIZE).map((draft, i) => entryRow(draft, start + i)));
    pagerEl.hidden = pages <= 1;
    prevBtn.disabled = page === 0;
    nextBtn.disabled = page === pages - 1;
    pageInfo.textContent = \`第 \${page + 1} / \${pages} 页，共 \${drafts.length} 条\`;
  }

  addBtn.addEventListener('click', () => {
    drafts.push(newEntry());
    page = Math.floor((drafts.length - 1) / ENTRY_PAGE_SIZE);
    render();
  });
  prevBtn.addEventListener('click', () => { if (page > 0) { page -= 1; render(); } });
  nextBtn.addEventListener('click', () => { page += 1; render(); });

  async function importSelectedFile() {
    const file = fileInput.files?.[0];
    if (!file) return;
    const current = ++revision;
    busy = true;
    statusEl.classList.remove('error-text');
    statusEl.textContent = '正在读取世界书…';
    try {
      if (file.size > W.MAX_IMPORT_BYTES) throw new Error('文件过大，请使用 10 MB 以内的世界书 JSON');
      const text = await file.text();
      if (current !== revision) return;
      const result = W.parseWorldbookJson(text, file.name);
      drafts = result.entries.map(entryToDraft);
      page = 0;
      statusEl.textContent =
        \`已导入 \${result.summary.total} 条，其中 \${result.summary.disabled} 条禁用。\` +
        (result.summary.generatedNames ? \`\${result.summary.generatedNames} 条未命名条目已生成名称。\` : '') +
        '请检查条目并填写名称、作者，点击「提交」后才会上传。';
      render();
    } catch (error) {
      if (current !== revision) return;
      statusEl.classList.add('error-text');
      statusEl.textContent = error.message || '读取失败，原草稿已保留';
    } finally {
      if (current === revision) {
        fileInput.value = '';
        busy = false;
      }
    }
  }
  fileInput.addEventListener('change', importSelectedFile);

  return {
    reset() {
      revision += 1;
      busy = false;
      fileInput.value = '';
      statusEl.textContent = '';
      statusEl.classList.remove('error-text');
      drafts = [newEntry()];
      page = 0;
      render();
    },
    /** 用已存在的条目（存储形状）覆盖草稿——编辑已上传的包时用 */
    setEntries(entries) {
      revision += 1;
      busy = false;
      fileInput.value = '';
      statusEl.textContent = '';
      statusEl.classList.remove('error-text');
      drafts = (entries ?? []).map(entryToDraft);
      if (drafts.length === 0) drafts.push(newEntry());
      page = 0;
      render();
    },
    getEntries() {
      // 整行留空（名字与正文都空）的草稿不提交——默认那一行空草稿不该变成一条非法条目
      return drafts.filter(draft => String(draft.name ?? '').trim() || String(draft.content ?? '').trim()).map(buildEntryObject);
    },
    isBusy() {
      return busy;
    },
  };
}

function mountEntryEditor(mountEl, { title, hint }) {
  const wrap = el('div');
  const head = el('div', 'row-between');
  head.append(el('h3', 'section-title', title));
  const addBtn = button('+ 添加条目', 'small');
  head.append(addBtn);
  wrap.append(head);

  const fileWrap = el('label', 'field full');
  fileWrap.append(el('span', 'field-label', '从酒馆导出的世界书 JSON 导入'));
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json,application/json';
  fileWrap.append(fileInput);
  wrap.append(fileWrap);
  if (hint) wrap.append(el('p', 'hint', hint));

  const statusEl = el('p', 'hint status-line');
  statusEl.setAttribute('role', 'status');
  statusEl.setAttribute('aria-live', 'polite');
  wrap.append(statusEl);

  const listEl = el('div');
  wrap.append(listEl);

  const pagerEl = el('div', 'row-between');
  const prevBtn = button('上一页', 'small');
  const pageInfo = el('span', 'hint');
  const nextBtn = button('下一页', 'small');
  pagerEl.append(prevBtn, pageInfo, nextBtn);
  wrap.append(pagerEl);

  mountEl.append(wrap);
  return createEntryEditor({ listEl, pagerEl, prevBtn, nextBtn, pageInfo, addBtn, fileInput, statusEl });
}

// ==================== 6. 上传：可增删的行列表（任务/成就） ====================
function boundInput(obj, key) {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = obj[key] ?? '';
  input.addEventListener('input', () => { obj[key] = input.value; });
  return input;
}

function createTaskList({ listEl, addBtn, label, fields }) {
  const items = [];
  function render() {
    listEl.replaceChildren(
      ...items.map((item, index) => {
        const row = el('div', 'entry-row');
        const head = el('div', 'entry-head');
        head.append(el('span', 'entry-index', \`\${label} \${index + 1}\`));
        head.append(button('删除', 'danger small', () => { items.splice(index, 1); render(); }));
        row.append(head);
        for (const [key, text] of fields) row.append(field(text, boundInput(item, key)));
        return row;
      }),
    );
  }
  addBtn.addEventListener('click', () => {
    items.push(Object.fromEntries(fields.map(([key]) => [key, ''])));
    render();
  });
  return {
    get() {
      return items
        .map(item => Object.fromEntries(Object.entries(item).map(([key, value]) => [key, value.trim()])))
        .filter(item => Object.values(item).some(value => value));
    },
    reset() {
      items.length = 0;
      render();
    },
    /** 用已存在的行（对象数组）覆盖——编辑已上传的包时用 */
    set(rows) {
      items.length = 0;
      for (const row of rows ?? []) {
        const item = {};
        for (const [key] of fields) item[key] = String(row?.[key] ?? '');
        items.push(item);
      }
      render();
    },
  };
}

function mountTaskList(mountEl, { title, label, fields }) {
  const wrap = el('div');
  const head = el('div', 'row-between');
  head.append(el('h3', 'section-title', title));
  const addBtn = button('+ 添加', 'small');
  head.append(addBtn);
  wrap.append(head);
  const listEl = el('div');
  wrap.append(listEl);
  mountEl.append(wrap);
  return createTaskList({ listEl, addBtn, label, fields });
}

// ==================== 6. 上传：各类结构表单 ====================
const TASK_FIELDS = [
  ['名称', '名称'],
  ['说明', '说明'],
  ['奖励', '奖励（选填）'],
];
const ACHIEVEMENT_FIELDS = [
  ['名称', '名称'],
  ['说明', '说明'],
  ['难度', '难度（选填）'],
  ['奖励', '奖励（选填）'],
];

function commonEntryProblems(entries) {
  if (entries.length === 0) return '至少要有一条世界书条目';
  for (const entry of entries) {
    if (!entry.name) return '每条条目都要有名称';
    if (!entry.content) return \`条目「\${entry.name || '（未命名）'}」缺少正文\`;
    if (!entry.constant && entry.keys.length === 0) return \`条目「\${entry.name}」是绿灯，至少要有一个主关键词（或设为蓝灯）\`;
  }
  return '';
}

function createMechanismSection() {
  const root = el('section', 'type-section');
  root.append(el('p', 'hint', '机制拓展 = 世界书条目集合；渲染为绿灯条目并加上 [回廊mod][机制拓展] 前缀。'));
  const editor = mountEntryEditor(root, {
    title: '世界书条目',
    hint: '也可以直接导入一份从酒馆导出的世界书 JSON 覆盖当前条目。',
  });
  return {
    el: root,
    reset: () => editor.reset(),
    fill: pack => editor.setEntries(pack?.条目),
    build: () => ({ 条目: editor.getEntries() }),
    validate: () => commonEntryProblems(editor.getEntries()),
    isBusy: () => editor.isBusy(),
  };
}

function createEventSection() {
  const root = el('section', 'type-section');
  const editor = mountEntryEditor(root, {
    title: '事件条目',
    hint: '每个事件条目名必须以 事件_ 开头（推荐 事件_<包名>_<事件名>，避免与其他包撞名）。事件条目一律按绿灯装填，关键词由你写。',
  });

  root.append(el('h3', 'section-title', '控制器条目（可选）'));
  const grid = el('div', 'form');
  const ctrlName = textInput('EJS/<包名>控制器');
  const ctrlBody = textArea(5, "<% const 事件 = getwi('事件_<包名>_…'); %>");
  grid.append(field('名称（须以 EJS/ 开头）', ctrlName), field('正文（EJS 模板）', ctrlBody, 'full'));
  root.append(grid);
  root.append(el('p', 'hint', "控制器与主卡控制器并行渲染；正文里用 getwi('事件_…') 挑事件。名称与正文都留空则不提交控制器。"));

  function controller() {
    const name = ctrlName.value.trim();
    const body = ctrlBody.value;
    if (!name && !body.trim()) return null;
    if (!/^EJS\\//.test(name)) throw new Error('控制器条目名必须以 EJS/ 开头');
    if (!body.trim()) throw new Error('控制器正文不能为空');
    return { 名称: name, 正文: body };
  }

return {
    el: root,
    reset() {
      editor.reset();
      ctrlName.value = '';
      ctrlBody.value = '';
    },
    fill(pack) {
      editor.setEntries(pack?.事件条目);
      const ctrl = pack?.控制器条目 ?? {};
      ctrlName.value = ctrl.名称 ?? '';
      ctrlBody.value = ctrl.正文 ?? '';
    },
    build() {
      const 控制器条目 = controller();
      return 控制器条目 ? { 事件条目: editor.getEntries(), 控制器条目 } : { 事件条目: editor.getEntries() };
    },
    validate() {
      const entries = editor.getEntries();
      if (entries.length === 0) return '事件包至少要有一条事件条目';
      for (const entry of entries) {
        if (!entry.name) return '每条事件条目都要有名称';
        if (!entry.name.startsWith('事件_')) return \`事件条目名必须以 事件_ 开头：「\${entry.name}」\`;
        if (!entry.content) return \`条目「\${entry.name}」缺少正文\`;
        if (!entry.constant && entry.keys.length === 0) return \`条目「\${entry.name}」是绿灯，至少要有一个主关键词（或设为蓝灯）\`;
      }
      return '';
    },
    isBusy: () => editor.isBusy(),
  };
}

function createDungeonSection() {
  const root = el('section', 'type-section');
  root.append(el('h3', 'section-title', '副本信息'));
  const grid = el('div', 'form');
  const name = textInput('雾中列车');
  const category = selectInput([['和平', '和平'], ['阵营', '阵营'], ['血腥', '血腥']], '和平');
  const level = document.createElement('input');
  level.type = 'number';
  level.min = '1';
  level.step = '1';
  level.value = '1';
  const limit = textInput('三天');
  grid.append(field('副本名称 *', name), field('副本类型', category), field('基准等级 *', level), field('时间限制', limit));
  const background = textArea(3);
  const map = textArea(3);
  const enemies = textArea(3);
  grid.append(field('背景设定 *', background, 'full'), field('地图与区域 *', map, 'full'), field('敌人配置 *', enemies, 'full'));
  root.append(grid);

  root.append(el('h3', 'section-title', '主线任务 *'));
  const mainGrid = el('div', 'form');
  const mainName = textInput();
  const mainDesc = textArea(3);
  const mainReward = textInput();
  mainGrid.append(field('名称 *', mainName), field('说明 *', mainDesc, 'full'), field('奖励（选填）', mainReward));
  root.append(mainGrid);

  const sub = mountTaskList(root, { title: '支线任务', label: '支线任务', fields: TASK_FIELDS });
  const world = mountTaskList(root, { title: '世界事件', label: '世界事件', fields: TASK_FIELDS });
  const hidden = mountTaskList(root, { title: '隐藏任务', label: '隐藏任务', fields: TASK_FIELDS });
  const achievements = mountTaskList(root, { title: '成就', label: '成就', fields: ACHIEVEMENT_FIELDS });

  const gmGrid = el('div', 'form');
  const gm = textArea(4);
  gmGrid.append(field('GM 指导 *（主持话术与判定口径）', gm, 'full'));
  root.append(gmGrid);

  const editor = mountEntryEditor(root, {
    title: '额外条目（可选）',
    hint: '副本主体会渲染成 1 条绿灯条目（关键词 = 副本名称），这里再附加可选的世界书条目。',
  });

  return {
    el: root,
    reset() {
      name.value = '';
      category.value = '和平';
      level.value = '1';
      limit.value = '三天';
      background.value = '';
      map.value = '';
      enemies.value = '';
      mainName.value = '';
      mainDesc.value = '';
      mainReward.value = '';
      gm.value = '';
      sub.reset();
      world.reset();
      hidden.reset();
      achievements.reset();
      editor.reset();
    },
    /** 把一份副本包填回表单（字段名见 src/wxhl-cygf/pack/dungeon.ts） */
    fill(pack) {
      const d = pack ?? {};
      if (d.副本名称 !== undefined) name.value = String(d.副本名称 ?? '');
      if (['和平', '阵营', '血腥'].includes(d.副本类型)) category.value = d.副本类型;
      if (d.基准等级 !== undefined) level.value = String(d.基准等级);
      if (d.时间限制 !== undefined) limit.value = String(d.时间限制);
      if (d.背景设定 !== undefined) background.value = String(d.背景设定 ?? '');
      if (d.地图与区域 !== undefined) map.value = String(d.地图与区域 ?? '');
      if (d.敌人配置 !== undefined) enemies.value = String(d.敌人配置 ?? '');
      const main = d.主线任务 ?? {};
      if (main.名称 !== undefined) mainName.value = String(main.名称 ?? '');
      if (main.说明 !== undefined) mainDesc.value = String(main.说明 ?? '');
      if (main.奖励 !== undefined) mainReward.value = String(main.奖励 ?? '');
      sub.set(d.支线任务);
      world.set(d.世界事件);
      hidden.set(d.隐藏任务);
      achievements.set(d.成就);
      if (d.GM指导 !== undefined) gm.value = String(d.GM指导 ?? '');
      editor.setEntries(d.额外条目);
    },
    build() {
      return {
        副本名称: name.value.trim(),
        副本类型: category.value,
        基准等级: intOr(level.value, 0),
        时间限制: limit.value.trim() || '未指定',
        背景设定: background.value,
        地图与区域: map.value,
        敌人配置: enemies.value,
        主线任务: { 名称: mainName.value.trim(), 说明: mainDesc.value.trim(), 奖励: mainReward.value.trim() },
        支线任务: sub.get(),
        世界事件: world.get(),
        隐藏任务: hidden.get(),
        成就: achievements.get(),
        GM指导: gm.value.trim(),
        额外条目: editor.getEntries(),
      };
    },
    validate() {
      if (!name.value.trim()) return '请填写副本名称';
      if (!(intOr(level.value, 0) >= 1)) return '基准等级须是不小于 1 的整数';
      if (!background.value.trim()) return '请填写背景设定';
      if (!map.value.trim()) return '请填写地图与区域';
      if (!enemies.value.trim()) return '请填写敌人配置';
      if (!mainName.value.trim()) return '主线任务需要名称';
      if (!mainDesc.value.trim()) return '主线任务需要说明';
      if (!gm.value.trim()) return 'GM 指导不能为空（主持话术与判定口径）';
      return '';
    },
    isBusy: () => editor.isBusy(),
  };
}

const EQUIP_SLOTS = ['主武器', '副武器', '头部', '躯干', '手部', '下装', '饰品'];
const ATTRIBUTES = ['STR', 'AGI', 'CON', 'PER'];
const 转职状态选项 = ['未解锁', '未选择', '当前', '已完成', '跳过', '已放弃'];

// 主卡 装备槽Schema 的 18 个字段（顺序与主卡一致）；kind: text / number / json
const EQUIP_FIELDS = [
  ['名称', 'text'],
  ['类型', 'text'],
  ['品质', 'text'],
  ['阶位', 'text'],
  ['穿戴门槛', 'text'],
  ['强化等级', 'number'],
  ['伤害骰', 'text'],
  ['倍率', 'number'],
  ['主属性', 'text'],
  ['副属性', 'text'],
  ['主属性加成', 'number'],
  ['副属性加成', 'number'],
  ['装备防御', 'number'],
  ['装备闪避', 'number'],
  ['负重', 'number'],
  ['效果', 'json'],
  ['描述', 'text'],
  ['数量', 'number'],
];
const EQUIP_DEFAULTS = {
  名称: '', 类型: '无', 品质: '无', 阶位: '无', 穿戴门槛: '无', 强化等级: 0, 伤害骰: '无', 倍率: 0,
  主属性: '无', 副属性: '无', 主属性加成: 0, 副属性加成: 0, 装备防御: 0, 装备闪避: 0, 负重: 0, 描述: '无', 数量: 1,
};

/** 递归的分支树编辑器（一律用 DOM API 构建，绝不拼 HTML 字符串）：分支名/状态/详情字段 + 可增删的子分支 */
function createTransferTreeEditor(listEl) {
  const branches = [];
  let depthWarned = false;

  const blankNode = () => ({
    分支名: '',
    状态: '未选择',
    详细内容: '',
    效果: '',
    主属性加成属性: '',
    主属性加成值: '',
    副属性加成属性: '',
    副属性加成值: '',
    职业特性: '',
    职业技能: '',
    子分支: [],
  });

  function nodeText(node, key, placeholder) {
    const input = textInput(placeholder);
    input.value = node[key] ?? '';
    input.addEventListener('input', () => { node[key] = input.value; });
    return input;
  }
  function nodeNumber(node, key) {
    const input = numberInput(node[key] ?? '');
    input.addEventListener('input', () => { node[key] = input.value; });
    return input;
  }
  function nodeTextarea(node, key, rows, placeholder) {
    const area = textArea(rows, placeholder);
    area.value = node[key] ?? '';
    area.addEventListener('input', () => { node[key] = area.value; });
    return area;
  }
  function nodeState(node) {
    const opts = [...转职状态选项];
    if (node.状态 && !opts.includes(node.状态)) opts.push(node.状态); // 保留非枚举的自定义状态
    const select = selectInput(opts.map(o => [o, o]), node.状态 || '未选择');
    select.addEventListener('change', () => { node.状态 = select.value; });
    return select;
  }

  function renderNode(node, siblings, depth) {
    const box = el('div', 'entry-row');
    box.style.gridColumn = '1 / -1'; // 嵌在父级 .entry-row 网格里时整行铺满
    if (depth > 0) box.style.marginLeft = Math.min(depth, 8) * 16 + 'px';
    const head = el('div', 'entry-head');
    head.append(el('span', 'entry-index', depth === 0 ? '分支' : \`↳ 子分支（第 \${depth + 1} 层）\`));
    const actions = el('div', 'row-actions');
    actions.append(button('＋ 子分支', 'small', () => {
      if (!depthWarned && depth + 1 >= 6) {
        depthWarned = true;
        if (!window.confirm('转职树已经很深了（≥6 层）。继续加深不利于解析与展示，确定继续吗？')) return;
      }
      node.子分支.push(blankNode());
      render();
    }));
    actions.append(button('删除本分支', 'danger small', () => {
      const index = siblings.indexOf(node);
      if (index >= 0) siblings.splice(index, 1);
      render();
    }));
    head.append(actions);
    box.append(head);

    box.append(field('分支名', nodeText(node, '分支名', '一转·卫士')));
    box.append(field('状态', nodeState(node)));
    box.append(field('详细内容', nodeText(node, '详细内容')));
    box.append(field('效果', nodeText(node, '效果')));
    box.append(field('主属性加成·属性', nodeText(node, '主属性加成属性', 'CON')));
    box.append(field('主属性加成·值', nodeNumber(node, '主属性加成值')));
    box.append(field('副属性加成·属性', nodeText(node, '副属性加成属性', 'STR')));
    box.append(field('副属性加成·值', nodeNumber(node, '副属性加成值')));
    box.append(field('职业特性（JSON）', nodeTextarea(node, '职业特性', 2, '{ "特性名": "描述" }'), 'full'));
    box.append(field('职业技能（JSON）', nodeTextarea(node, '职业技能', 2, '{ "技能名": { "类型": "主动" } }'), 'full'));

    for (const child of node.子分支) box.append(renderNode(child, node.子分支, depth + 1));
    return box;
  }

  function render() {
    listEl.replaceChildren(...branches.map(node => renderNode(node, branches, 0)));
  }

  /** 节点 → 载荷：状态总带上；详情/分支只在非空时才出现（其余交给 schema 的 prefault） */
  function nodeToPayload(node) {
    const out = { 状态: node.状态 || '未选择' };
    const 详情 = {};
    if (node.详细内容.trim()) 详情.详细内容 = node.详细内容.trim();
    if (node.效果.trim()) 详情.效果 = node.效果.trim();
    if (node.主属性加成属性.trim() || node.主属性加成值.trim()) {
      详情.主属性加成 = { 属性: node.主属性加成属性.trim() || '无', 值: numOr(node.主属性加成值, 0) };
    }
    if (node.副属性加成属性.trim() || node.副属性加成值.trim()) {
      详情.副属性加成 = { 属性: node.副属性加成属性.trim() || '无', 值: numOr(node.副属性加成值, 0) };
    }
    if (node.职业特性.trim()) 详情.职业特性 = parseJsonObject(node.职业特性, '转职树·职业特性');
    if (node.职业技能.trim()) 详情.职业技能 = parseJsonObject(node.职业技能, '转职树·职业技能');
    if (Object.keys(详情).length) out.详情 = 详情;

    const 分支 = {};
    for (const child of node.子分支) {
      const 名 = child.分支名.trim();
      if (!名) continue; // 未命名的分支连同其子树一起丢掉
      分支[名] = nodeToPayload(child);
    }
    if (Object.keys(分支).length) out.分支 = 分支;
    return out;
  }

  function payloadToNode(名, obj) {
    const node = blankNode();
    node.分支名 = 名;
    if (obj && typeof obj === 'object') {
      if (typeof obj.状态 === 'string') node.状态 = obj.状态;
      const 详情 = obj.详情 ?? {};
      if (详情.详细内容 !== undefined) node.详细内容 = String(详情.详细内容 ?? '');
      if (详情.效果 !== undefined) node.效果 = String(详情.效果 ?? '');
      if (详情.主属性加成) {
        node.主属性加成属性 = String(详情.主属性加成.属性 ?? '');
        node.主属性加成值 = String(详情.主属性加成.值 ?? '');
      }
      if (详情.副属性加成) {
        node.副属性加成属性 = String(详情.副属性加成.属性 ?? '');
        node.副属性加成值 = String(详情.副属性加成.值 ?? '');
      }
      if (详情.职业特性 !== undefined) node.职业特性 = JSON.stringify(详情.职业特性, null, 2);
      if (详情.职业技能 !== undefined) node.职业技能 = JSON.stringify(详情.职业技能, null, 2);
      for (const [子名, 子obj] of Object.entries(obj.分支 ?? {})) node.子分支.push(payloadToNode(子名, 子obj));
    }
    return node;
  }

  return {
    add() {
      branches.push(blankNode());
      render();
    },
    get() {
      const 分支 = {};
      for (const node of branches) {
        const 名 = node.分支名.trim();
        if (!名) continue;
        分支[名] = nodeToPayload(node);
      }
      return 分支;
    },
    set(tree) {
      branches.length = 0;
      for (const [名, obj] of Object.entries(tree?.分支 ?? {})) branches.push(payloadToNode(名, obj));
      render();
    },
    reset() {
      branches.length = 0;
      depthWarned = false;
      render();
    },
  };
}

function createBuildSection() {
  const root = el('section', 'type-section');
  const grid = el('div', 'form');
  const name = textInput('重装堡垒');
  const role = textInput('物理破坏配合高容错换血');
  const level = textInput('1');
  const tier = textInput('一阶');
  const attrs = Object.fromEntries(ATTRIBUTES.map(a => [a, textInput('5')]));
  grid.append(
    field('构筑名 *', name),
    field('定位 *', role),
    field('等级', level),
    field('阶位（一阶 / 二阶 / 三阶 / 四阶 / 五阶 / 超脱）', tier),
    ...ATTRIBUTES.map(a => field(a + '（属性值）', attrs[a])),
  );
  root.append(grid);

  // 快速填充：从酒馆读当前契约者 / 粘贴变量 JSON。主副属性由四个数值自动推导，不再手填。
  const captureStatus = el('div', 'hint status-line', '');
  const sayOk = m => { captureStatus.classList.remove('error-text'); captureStatus.textContent = m; };
  const sayErr = m => { captureStatus.classList.add('error-text'); captureStatus.textContent = m; };
  const readSaveBtn = button('从我的存档读取', 'btn', () => {
    sayOk('正在读取当前契约者…');
    bridge
      .request('readContractor')
      .then(res => {
        fillFromBuild(W.parseBuildJson(JSON.stringify(res)));
        sayOk('已从存档读取当前契约者构筑');
      })
      .catch(error => sayErr(error?.message || String(error)));
  });
  const pasteBox = textArea(4, '{ "stat_data": { "契约者": { … } } } —— 也可直接粘契约者子树或一份构筑载荷');
  const pasteBtn = button('粘贴 JSON 捕捉', 'btn', () => {
    try {
      fillFromBuild(W.parseBuildJson(pasteBox.value));
      sayOk('已从粘贴内容捕捉构筑');
    } catch (error) {
      sayErr(error?.message || String(error));
    }
  });
  const captureGrid = el('div', 'form');
  captureGrid.append(readSaveBtn, pasteBtn);
  root.append(el('h3', 'section-title', '快速填充（可选）'), captureGrid, field('粘贴 JSON', pasteBox, 'full'), captureStatus);

  // 头部组件（天赋 / 血统）
  const headComponents = {};
  for (const key of ['天赋', '血统']) {
    const g = el('div', 'form');
    const parts = { 名称: textInput('无'), 品质: textInput('无'), 属性加成: textInput('无'), 效果: textArea(2, '{ "力量+5": "始终生效" }') };
    g.append(field(\`\${key}·名称\`, parts.名称), field(\`\${key}·品质\`, parts.品质), field(\`\${key}·属性加成\`, parts.属性加成), field(\`\${key}·效果（JSON）\`, parts.效果, 'full'));
    headComponents[key] = parts;
    root.append(el('h3', 'section-title', key));
    root.append(g);
  }

  root.append(el('h3', 'section-title', '称号'));
  const titleGrid = el('div', 'form');
  const titleName = textInput('无');
  const titleEffect = textArea(2, '{ "暴击率+5%": "常驻" }');
  titleGrid.append(field('称号·名称', titleName), field('称号·效果（JSON）', titleEffect, 'full'));
  root.append(titleGrid);

  root.append(el('h3', 'section-title', '职业'));
  const jobGrid = el('div', 'form');
  const jobName = textInput('无');
  const jobRarity = textInput('无');
  const jobTreeName = textInput('无');
  const jobTreeState = selectInput(转职状态选项.map(o => [o, o]), '未选择');
  const jobIntro = textArea(2, '以盾护人、以守为攻的前排');
  const jobStage = textInput('基础');
  const jobLevel = textInput('0');
  const jobMainBonus = textInput('CON');
  const jobMainBonusValue = textInput('0');
  const jobSubBonus = textInput('无');
  const jobSubBonusValue = textInput('0');
  const jobTraits = textArea(2, '{ "特性名": "描述" }');
  const jobSkills = textArea(3, '{ "职业技能名": { "类型": "主动", "效果": {} } }');
  const jobInherited = textArea(3, '{ "传承技能名": { "类型": "被动", "效果": {} } }');
  jobGrid.append(
    field('职业·名称', jobName),
    field('职业·稀有度', jobRarity),
    field('转职树·名称', jobTreeName),
    field('转职树·状态', jobTreeState),
    field('转职阶段', jobStage),
    field('职业等级', jobLevel),
    field('主属性加成·属性', jobMainBonus),
    field('主属性加成·值', jobMainBonusValue),
    field('副属性加成·属性', jobSubBonus),
    field('副属性加成·值', jobSubBonusValue),
    field('职业简介', jobIntro, 'full'),
    field('职业特性（JSON）', jobTraits, 'full'),
    field('职业技能（JSON，技能名 → 技能）', jobSkills, 'full'),
    field('传承技能（JSON，技能名 → 技能）', jobInherited, 'full'),
  );
  root.append(jobGrid);

  // 转职树·分支：可自定义、可增减的递归编辑器（整棵树可为空，非必填）
  const treeWrap = el('div');
  const treeHead = el('div', 'row-between');
  treeHead.append(el('h3', 'section-title', '转职树·分支（可增删，留空则不提交）'));
  const treeAddBtn = button('+ 添加分支', 'small');
  treeHead.append(treeAddBtn);
  const treeList = el('div');
  treeWrap.append(treeHead, treeList);
  root.append(treeWrap);
  const transferTree = createTransferTreeEditor(treeList);
  treeAddBtn.addEventListener('click', () => transferTree.add());

  root.append(el('h3', 'section-title', '通用技能（JSON，技能名 → 技能）'));
  const commonSkills = textArea(3, '{ "重击": { "类型": "主动", "消耗": "10体力", "效果": { "伤害": "2d6" } } }');
  const skillGrid = el('div', 'form');
  skillGrid.append(field('通用技能', commonSkills, 'full'));
  root.append(skillGrid);

  root.append(el('h3', 'section-title', '主要装备（七槽，留空槽不提交；所有字段非必填）'));
  const equipGrid = el('div');
  const slots = {};
  for (const slot of EQUIP_SLOTS) {
    const parts = {};
    for (const [key, kind] of EQUIP_FIELDS) {
      if (kind === 'number') parts[key] = numberInput(EQUIP_DEFAULTS[key]);
      else if (kind === 'json') parts[key] = textArea(2, '{ "特效名": "描述" }');
      else parts[key] = textInput('无');
    }
    slots[slot] = parts;
    const block = el('div', 'entry-row');
    const head = el('div', 'entry-head');
    head.append(el('span', 'entry-index', \`\${slot}（名称为空或「无」→ 不提交此槽）\`));
    block.append(head);
    for (const [key, kind] of EQUIP_FIELDS) {
      block.append(field(key === '效果' ? '效果（JSON）' : key, parts[key], kind === 'json' ? 'full' : undefined));
    }
    equipGrid.append(block);
  }
  root.append(equipGrid);

  root.append(el('h3', 'section-title', '背包建议（JSON，物品名 → { 描述, 数量 }）'));
  const bagGrid = el('div', 'form');
  const bag = textArea(3, '{ "治疗药水": { "描述": "恢复 2d6 生命", "数量": 3 } }');
  bagGrid.append(field('背包建议', bag, 'full'));
  root.append(bagGrid);

  function headPayload(key) {
    const parts = headComponents[key];
    return {
      名称: parts.名称.value.trim() || '无',
      品质: parts.品质.value.trim() || '无',
      属性加成: parts.属性加成.value.trim() || '无',
      效果: parseJsonObject(parts.效果.value, \`\${key}·效果\`),
    };
  }


  /** 把一份构筑载荷填回表单（读存档 / 粘贴捕捉共用） */
  function fillFromBuild(buildPayload) {
    const b = buildPayload?.build ?? buildPayload ?? {};
    if (b.构筑名) name.value = b.构筑名;
    if (b.定位) role.value = b.定位;
    if (b.等级 !== undefined) level.value = String(b.等级);
    if (b.阶位) tier.value = b.阶位;
    for (const a of ATTRIBUTES) {
      const v = b.属性基础?.[a];
      if (v !== undefined && v !== null) attrs[a].value = String(v);
    }
    const head = (key, node) => {
      const src = b[key];
      if (!src) return;
      if (src.名称 !== undefined) node.名称.value = String(src.名称 ?? '无');
      if (src.品质 !== undefined) node.品质.value = String(src.品质 ?? '无');
      if (src.属性加成 !== undefined) node.属性加成.value = String(src.属性加成 ?? '无');
      if (src.效果) node.效果.value = JSON.stringify(src.效果, null, 2);
    };
    head('天赋', headComponents['天赋']);
    head('血统', headComponents['血统']);
    if (b.称号?.名称 !== undefined) titleName.value = String(b.称号.名称 ?? '无');
    if (b.称号?.效果) titleEffect.value = JSON.stringify(b.称号.效果, null, 2);
    const job = b.职业 ?? {};
    if (job.名称 !== undefined) jobName.value = String(job.名称 ?? '无');
    if (job.稀有度 !== undefined) jobRarity.value = String(job.稀有度 ?? '无');
    if (job.转职阶段 !== undefined) jobStage.value = String(job.转职阶段 ?? '基础');
    if (job.职业等级 !== undefined) jobLevel.value = String(job.职业等级 ?? 0);
    if (job.职业简介 !== undefined) jobIntro.value = job.职业简介 === '无' ? '' : String(job.职业简介);
    if (job.主属性加成) {
      jobMainBonus.value = String(job.主属性加成.属性 ?? '无');
      jobMainBonusValue.value = String(job.主属性加成.值 ?? 0);
    }
    if (job.副属性加成) {
      jobSubBonus.value = String(job.副属性加成.属性 ?? '无');
      jobSubBonusValue.value = String(job.副属性加成.值 ?? 0);
    }
    if (job.职业特性) jobTraits.value = JSON.stringify(job.职业特性, null, 2);
    if (job.职业技能) jobSkills.value = JSON.stringify(job.职业技能, null, 2);
    if (job.传承技能) jobInherited.value = JSON.stringify(job.传承技能, null, 2);
    if (job.转职树?.名称) jobTreeName.value = String(job.转职树.名称);
    if (job.转职树?.状态) jobTreeState.value = String(job.转职树.状态);
    transferTree.set(job.转职树);
    if (b.通用技能) commonSkills.value = JSON.stringify(b.通用技能, null, 2);
    const equip = b.主要装备 ?? {};
    for (const slot of EQUIP_SLOTS) {
      const src = equip[slot];
      if (!src) continue;
      const parts = slots[slot];
      for (const [key, kind] of EQUIP_FIELDS) {
        if (kind === 'json') {
          parts[key].value = src[key] && Object.keys(src[key]).length ? JSON.stringify(src[key], null, 2) : '';
        } else {
          parts[key].value = String(src[key] ?? EQUIP_DEFAULTS[key]);
        }
      }
    }
  }

  return {
    el: root,
    fill: buildPayload => fillFromBuild(buildPayload),
    reset() {
      name.value = '';
      role.value = '';
      level.value = '1';
      tier.value = '一阶';
      for (const a of ATTRIBUTES) attrs[a].value = '5';
      pasteBox.value = '';
      captureStatus.textContent = '';
      for (const key of ['天赋', '血统']) {
        const parts = headComponents[key];
        parts.名称.value = '无';
        parts.品质.value = '无';
        parts.属性加成.value = '无';
        parts.效果.value = '';
      }
      titleName.value = '无';
      titleEffect.value = '';
      jobName.value = '无';
      jobRarity.value = '无';
      jobTreeName.value = '无';
      jobTreeState.value = '未选择';
      jobIntro.value = '';
      jobStage.value = '基础';
      jobLevel.value = '0';
      jobMainBonus.value = 'CON';
      jobMainBonusValue.value = '0';
      jobSubBonus.value = '无';
      jobSubBonusValue.value = '0';
      jobTraits.value = '';
      jobSkills.value = '';
      jobInherited.value = '';
      transferTree.reset();
      commonSkills.value = '';
      for (const slot of EQUIP_SLOTS) {
        const parts = slots[slot];
        for (const [key, kind] of EQUIP_FIELDS) {
          parts[key].value = kind === 'json' ? '' : String(EQUIP_DEFAULTS[key]);
        }
      }
      bag.value = '';
    },
    build() {
      const 主要装备 = {};
      for (const slot of EQUIP_SLOTS) {
        const parts = slots[slot];
        const slotName = parts.名称.value.trim();
        if (!slotName || slotName === '无') continue; // 「无」= 空槽（粘贴来的实体常七槽全「无」）
        const 槽 = { 名称: slotName };
        for (const [key, kind] of EQUIP_FIELDS) {
          if (key === '名称') continue;
          if (kind === 'number') 槽[key] = numOr(parts[key].value, EQUIP_DEFAULTS[key]);
          else if (kind === 'json') 槽[key] = parseJsonObject(parts[key].value, \`\${slot}·效果\`);
          else 槽[key] = parts[key].value.trim() || '无';
        }
        主要装备[slot] = 槽;
      }
      return {
        build: {
          构筑名: name.value.trim(),
          定位: role.value.trim(),
          等级: intOr(level.value, 1),
          阶位: tier.value.trim() || '一阶',
          属性基础: Object.fromEntries(ATTRIBUTES.map(a => [a, intOr(attrs[a].value, 5)])),
          属性分配方向: W.deriveAttributeDirection(Object.fromEntries(ATTRIBUTES.map(a => [a, intOr(attrs[a].value, 5)]))),
          天赋: headPayload('天赋'),
          血统: headPayload('血统'),
          称号: { 名称: titleName.value.trim() || '无', 效果: parseJsonObject(titleEffect.value, '称号·效果') },
          职业: {
            名称: jobName.value.trim() || '无',
            稀有度: jobRarity.value.trim() || '无',
            转职阶段: jobStage.value.trim() || '基础',
            职业等级: intOr(jobLevel.value, 0),
            主属性加成: { 属性: jobMainBonus.value.trim() || '无', 值: intOr(jobMainBonusValue.value, 0) },
            副属性加成: { 属性: jobSubBonus.value.trim() || '无', 值: intOr(jobSubBonusValue.value, 0) },
            职业简介: jobIntro.value.trim() || '无',
            职业特性: parseJsonObject(jobTraits.value, '职业特性'),
            职业技能: parseJsonObject(jobSkills.value, '职业技能'),
            传承技能: parseJsonObject(jobInherited.value, '传承技能'),
            转职树: { 名称: jobTreeName.value.trim() || '无', 状态: jobTreeState.value || '未选择', 分支: transferTree.get() },
          },
          通用技能: parseJsonObject(commonSkills.value, '通用技能'),
          主要装备,
          背包建议: parseJsonObject(bag.value, '背包建议'),
        },
      };
    },
    validate() {
      if (!name.value.trim()) return '请填写构筑名';
      if (!role.value.trim()) return '请填写定位';
      if (intOr(level.value, 0) < 1) return '等级必须是 ≥1 的整数';
      if (!tier.value.trim()) return '请填写阶位（如 一阶）';
      for (const a of ATTRIBUTES) {
        if (!Number.isInteger(Number(attrs[a].value))) return \`\${a} 属性值必须是整数\`;
      }
      return '';
    },
    isBusy: () => false,
  };
}

function createPersonaSection() {
  const root = el('section', 'type-section');
  const grid = el('div', 'form');
  const name = textInput('雾中剑客');
  const appearance = textArea(2, '如：银白长发，左眼有一道旧疤');
  const outfit = textArea(2, '如：玄色长风衣，袖口绣银线');
  const glamour = textArea(2, '如：佩剑在夜里泛微光');
  const personality = textArea(2);
  const likes = textInput('剑术, 雨夜');
  const dislikes = textInput('噪音, 背叛');
  const background = textArea(4);
  const direction = textInput('敏捷双持 ➜ 影袭');
  grid.append(
    field('角色名 *', name),
    field('外貌', appearance, 'full'),
    field('衣着', outfit, 'full'),
    field('装备幻化', glamour, 'full'),
    field('性格', personality, 'full'),
    field('爱好（逗号分隔）', likes),
    field('厌恶（逗号分隔）', dislikes),
    field('背景故事 *', background, 'full'),
    field('构筑方向（选填）', direction, 'full'),
  );
  root.append(grid);
  root.append(el('h3', 'section-title', '可选：粘贴构筑 JSON'));
  const buildGrid = el('div', 'form');
  const buildJson = textArea(5, '{ "构筑名": "…", "定位": "…", "属性分配方向": { "主属性": "AGI" } }');
  buildGrid.append(field('构筑（完整 BuildPayload JSON，留空则不嵌入）', buildJson, 'full'));
  root.append(buildGrid);

  /** 把一份人设载荷填回表单（角色名/外观三件套/性格/爱好/厌恶/背景故事/构筑方向/可选构筑），编辑已上传的包时用 */
  function fillFromPersona(personaPayload) {
    const p = personaPayload?.persona ?? personaPayload ?? {};
    if (p.角色名 !== undefined) name.value = String(p.角色名 ?? '');
    if (p.外观) {
      appearance.value = String(p.外观.外貌 ?? '');
      outfit.value = String(p.外观.衣着 ?? '');
      glamour.value = String(p.外观.装备幻化 ?? '');
    }
    if (p.性格 !== undefined) personality.value = String(p.性格 ?? '');
    if (p.爱好 !== undefined) likes.value = Array.isArray(p.爱好) ? p.爱好.join(', ') : String(p.爱好 ?? '');
    if (p.厌恶 !== undefined) dislikes.value = Array.isArray(p.厌恶) ? p.厌恶.join(', ') : String(p.厌恶 ?? '');
    if (p.背景故事 !== undefined) background.value = String(p.背景故事 ?? '');
    if (p.构筑方向 !== undefined) direction.value = String(p.构筑方向 ?? '');
    if (p.构筑) buildJson.value = JSON.stringify(p.构筑, null, 2);
  }

  return {
    el: root,
    fill: personaPayload => fillFromPersona(personaPayload),
    reset() {
      name.value = '';
      appearance.value = '';
      outfit.value = '';
      glamour.value = '';
      personality.value = '';
      likes.value = '';
      dislikes.value = '';
      background.value = '';
      direction.value = '';
      buildJson.value = '';
    },
    build() {
      const raw = buildJson.value.trim();
      const persona = {
        角色名: name.value.trim(),
        外观: {
          外貌: appearance.value.trim(),
          衣着: outfit.value.trim(),
          装备幻化: glamour.value.trim(),
        },
        性格: personality.value,
        爱好: splitList(likes.value),
        厌恶: splitList(dislikes.value),
        背景故事: background.value,
        构筑方向: direction.value.trim(),
      };
      if (raw) persona.构筑 = parseJsonObject(raw, '构筑');
      return { persona };
    },
    validate() {
      if (!name.value.trim()) return '请填写角色名';
      if (!background.value.trim()) return '请填写背景故事';
      return '';
    },
    isBusy: () => false,
  };
}

// ==================== 6. 上传：装配 ====================
const SECTIONS = {
  mechanism: createMechanismSection(),
  event: createEventSection(),
  dungeon: createDungeonSection(),
  build: createBuildSection(),
  persona: createPersonaSection(),
};
const UPLOAD_TYPES = ['dungeon', 'event', 'mechanism', 'build', 'persona'];

function renderUploadTypeNav() {
  const nav = $('#uploadTypeNav');
  const buttons = [];
  for (const type of UPLOAD_TYPES) {
    const btn = button(W.PACK_TYPE_LABEL[type], 'type-btn');
    btn.dataset.value = type;
    btn.addEventListener('click', () => setUploadType(type));
    buttons.push(btn);
    nav.append(btn);
  }
  nav.__buttons = buttons;
}

function setUploadType(type) {
  if (state.editing) return; // 编辑中锁死类型：类型决定表单形状，中途改会让预填的字段对不上
  state.uploadType = type;
  const buttons = $('#uploadTypeNav').__buttons ?? [];
  for (const btn of buttons) btn.classList.toggle('active', btn.dataset.value === type);
  for (const [key, section] of Object.entries(SECTIONS)) section.el.hidden = key !== type;
  $('#upError').textContent = '';
}

function packBase() {
  return {
    format: 'wxhl-mod@2',
    id: state.draftId,
    name: $('#upName').value.trim(),
    type: state.uploadType,
    version: $('#upVersion').value.trim(),
    author: { name: $('#upAuthor').value.trim(), discord: $('#upDiscord').value.trim() },
    tags: splitList($('#upTags').value),
    description: $('#upDesc').value,
    cover: $('#upCover').value.trim(),
    requires: { cardVersion: '' },
  };
}

function validateCommon(pack) {
  if (!pack.name) return '请填写名称';
  if (!/^\\d+\\.\\d+\\.\\d+$/.test(pack.version)) return '版本号须为 x.y.z（如 1.0.0）';
  if (!pack.author.name) return '请填写作者名';
  if (!pack.description.trim()) return '请填写简介（列表卡片要显示）';
  if (pack.cover && !/^https?:\\/\\/[^\\s"'<>\\\\]+$/.test(pack.cover)) return '封面须是 http(s) 图片链接，且不含空白 / 引号 / 尖括号';
  return '';
}

function genId() {
  return Math.random().toString(36).slice(2, 10).padEnd(8, '0');
}

function openUpload() {
  showUploadView();
  setEditMode(null);
  resetUploadForm();
  // 若列表正筛选在某个类型，上传默认跟随该类型
  setUploadType(W.PACK_TYPE_LABEL[state.type] ? state.type : 'dungeon');
}

async function submitUpload() {
  const errorBox = $('#upError');
  errorBox.textContent = '';
  const section = SECTIONS[state.uploadType];
  if (section.isBusy()) {
    errorBox.textContent = '世界书仍在读取，请稍候';
    return;
  }
  let fragment;
  try {
    fragment = section.build();
  } catch (error) {
    errorBox.textContent = error.message;
    return;
  }
  const pack = { ...packBase(), ...fragment };
  const problem = validateCommon(pack) || section.validate();
  if (problem) {
    errorBox.textContent = problem;
    return;
  }
  const editing = state.editing;
  const submit = $('#upSubmit');
  submit.disabled = true;
  try {
    if (editing) {
      await W.api.update(editing.id, editing.key, pack);
      toast('已保存修改');
      showListView(); // 关掉上传视图并清掉编辑态
      await loadList({ reset: true });
      openDetail(editing.id);
    } else {
      const res = await W.api.upload(pack);
      showManageKey(res.id, res.manageKey);
    }
  } catch (error) {
    errorBox.textContent = error.message; // 服务端权威校验错误原样显示
    // 403 = 密钥不对（或包已被下架）：清掉记住的密钥，免得一直带着错的
    if (editing && error.status === 403) saveSavedKey(editing.id, '');
  } finally {
    submit.disabled = false;
  }
}

function showManageKey(id, manageKey) {
  $('#keyValue').textContent = manageKey;
  const copy = $('#keyCopy');
  copy.textContent = '复制';
  copy.onclick = async () => {
    try {
      await navigator.clipboard.writeText(manageKey);
      copy.textContent = '已复制';
    } catch {
      copy.textContent = '复制失败，请手动选择复制';
    }
  };
  $('#keyDetail').onclick = () => {
    $('#keyModal').hidden = true;
    openDetail(id);
  };
  $('#keyClose').onclick = () => {
    $('#keyModal').hidden = true;
    showListView();
    loadList({ reset: true });
  };
  $('#keyModal').hidden = false;
}

// ==================== 管理员面板（纯 HTTP，不依赖宿主桥） ====================
function openAdmin() {
  $('#adminView').hidden = false;
  $('#adminError').textContent = '';
}

function closeAdmin() {
  $('#adminView').hidden = true;
}

async function loadAdminList() {
  const key = $('#adminKey').value.trim();
  const errorBox = $('#adminError');
  errorBox.textContent = '';
  if (!key) {
    errorBox.textContent = '请先填写管理员密钥';
    return;
  }
  const listEl = $('#adminList');
  $('#adminResult').replaceChildren();
  listEl.replaceChildren(el('div', 'loading', '加载中…'));
  try {
    const res = await W.api.adminList(key);
    renderAdminRows(res?.rows ?? [], key);
  } catch (error) {
    listEl.replaceChildren();
    errorBox.textContent = error.message; // 服务端原文（403 = 管理密钥不正确或未配置）
  }
}

function renderAdminRows(rows, key) {
  const listEl = $('#adminList');
  if (rows.length === 0) {
    listEl.replaceChildren(el('div', 'empty', '没有内容包'));
    return;
  }
  listEl.replaceChildren(...rows.map(row => adminRow(row, key)));
}

function adminRow(row, key) {
  const box = el('div', 'preview-entry');
  const head = el('div', 'row-between');

  const left = el('div');
  const nameRow = el('div', 'detail-head');
  nameRow.append(el('span', 'preview-name', row.name ?? ''));
  nameRow.append(typeBadge(row.type));
  left.append(nameRow);
  left.append(el('div', 'detail-meta', \`作者：\${row.authorName ?? ''}\`));
  left.append(el('div', 'detail-meta', \`版本：v\${row.version ?? ''} · 更新：\${formatTime(row.updated)}\`));
  head.append(left);

  const actions = el('div', 'row-actions');
  actions.append(
    button('强制下架', 'danger small', () => adminDelete(row, key)),
    button('重置密钥', 'small', () => adminResetKey(row, key)),
  );
  head.append(actions);

  box.append(head);
  return box;
}

async function adminDelete(row, key) {
  if (!window.confirm(\`确定强制下架「\${row.name}」吗？此操作不可撤销。\`)) return;
  const errorBox = $('#adminError');
  errorBox.textContent = '';
  try {
    await W.api.adminDelete(key, [row.id]);
    toast('已下架：' + row.name);
    await loadAdminList(); // 下架后重载列表
  } catch (error) {
    errorBox.textContent = error.message;
  }
}

async function adminResetKey(row, key) {
  if (!window.confirm(\`为「\${row.name}」重置管理密钥？原密钥立即失效。\`)) return;
  const errorBox = $('#adminError');
  errorBox.textContent = '';
  try {
    const res = await W.api.adminResetKey(key, row.id);
    showAdminKey(res.manageKey);
  } catch (error) {
    errorBox.textContent = error.message;
  }
}

/** 新密钥只显示这一次——独立的可复制行 + 复制按钮 */
function showAdminKey(manageKey) {
  const head = el('div', 'row-between');
  head.append(el('span', 'hint', '新的管理密钥（只显示这一次，请立即保存）'));
  const copy = button('复制', 'primary small');
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(manageKey);
      copy.textContent = '已复制';
    } catch {
      copy.textContent = '复制失败，请手动选择复制';
    }
  });
  head.append(copy);
  $('#adminResult').replaceChildren(head, el('pre', 'key-value', manageKey));
}

// ==================== 装配 ====================
let searchTimer = 0;

function init() {
  initAgreement();

  renderTypeNav();
  renderUploadTypeNav();
  for (const section of Object.values(SECTIONS)) $('#uploadSections').append(section.el);

  $('#search').addEventListener('input', event => {
    state.q = event.target.value.trim();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadList({ reset: true }), 300);
  });
  $('#loadMore').addEventListener('click', () => loadList({ reset: false }));

  $('#uploadBtn').addEventListener('click', openUpload);
  $('#uploadBack').addEventListener('click', showListView);
  $('#detailBack').addEventListener('click', showListView);
  $('#upSubmit').addEventListener('click', submitUpload);

  // 管理员面板：纯 HTTP，不需要宿主桥
  $('#adminBtn').addEventListener('click', openAdmin);
  $('#adminClose').addEventListener('click', closeAdmin);
  $('#adminLoadBtn').addEventListener('click', loadAdminList);
  $('#adminKey').addEventListener('keydown', event => {
    if (event.key === 'Enter') loadAdminList();
  });

  loadList({ reset: true });
  probeBridge();
}

init();
</script>
</body>
</html>
`;var Gm=`// cloudflare/wxhl-cygf/page-lib.js
// 工坊页面的逻辑层：纯 JS ES module，浏览器直接 import，vitest 直接测。
// 桥协议与常量与宿主 src/wxhl-cygf/ 一一对应——改协议两边同步。

export const BRIDGE_CHANNEL = 'wxhl-workshop:worldbook';
export const WORKSHOP_WORLDBOOK = '无限回廊mod';
export const AGREEMENT_KEY = 'wxhl_cygf_agreement';

// ==================== 桥客户端 ====================
export function createBridgeClient({ parentWindow, selfWindow, timeoutMs = 30000 } = {}) {
  let seq = 0;
  const pending = new Map();
  const onMessage = event => {
    // 这里**故意不校验 event.source / event.origin**：
    // 宿主脚本跑在酒馆页面的**兄弟 iframe** 里，它回包时 event.source 是那个脚本 iframe，
    // 永远不会等于本页面的 window.parent（酒馆主窗口）—— 加这个守卫会把所有合法回包拦死
    // （2026-10-11 踩过：页面永远显示「未检测到宿主脚本」）。
    // 配对只靠 channel + kind + 每次请求唯一的 id；两份参考实现也都是这么做的。
    const d = event?.data;
    if (!d || d.channel !== BRIDGE_CHANNEL || d.kind !== 'response') return;
    const entry = pending.get(d.id);
    if (!entry) return;
    pending.delete(d.id);
    clearTimeout(entry.timer);
    if (d.ok) entry.resolve(d.payload);
    else entry.reject(new Error(d.error || '桥接调用失败'));
  };
  selfWindow.addEventListener('message', onMessage);
  return {
    request(action, payload = {}) {
      const id = \`r\${++seq}-\${Math.random().toString(36).slice(2, 8)}\`;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(\`桥接请求超时（\${action}）：宿主脚本未响应——请确认是从酒馆内的「创意工坊」按钮打开本页面\`));
        }, timeoutMs);
        pending.set(id, { resolve, reject, timer });
        parentWindow.postMessage({ channel: BRIDGE_CHANNEL, kind: 'request', id, action, payload }, '*');
      });
    },
    destroy() {
      selfWindow.removeEventListener('message', onMessage);
      for (const entry of pending.values()) {
        clearTimeout(entry.timer);
        entry.reject(new Error('桥接已销毁'));
      }
      pending.clear();
    },
  };
}

// ==================== 条目映射（扩展包条目 → 酒馆世界书条目） ====================
const POSITION_MAP = {
  before_char: 'before_character_definition',
  after_char: 'after_character_definition',
  at_depth: 'at_depth',
};

export function mapExtensionEntry(entry) {
  return {
    name: entry.name,
    enabled: entry.enabled !== false,
    strategy: {
      type: entry.constant ? 'constant' : 'selective',
      keys: entry.keys ?? [],
      keys_secondary: { logic: 'and_any', keys: entry.keysSecondary ?? [] },
      scan_depth: 'same_as_global',
    },
    position: {
      type: POSITION_MAP[entry.position ?? 'after_char'],
      role: 'system',
      depth: entry.depth ?? 0,
      order: entry.order ?? 100,
    },
    content: entry.content,
    probability: entry.probability ?? 100,
    recursion: {
      prevent_incoming: !!entry.preventRecursion,
      prevent_outgoing: !!entry.excludeRecursion,
      delay_until: null,
    },
    effect: { sticky: entry.sticky ?? null, cooldown: entry.cooldown ?? null, delay: entry.delay ?? null },
    // sourceId 等由宿主按 sourceMeta 盖章；这里留空骨架保持形状
    extra: { wxhlWorkshop: { sourceId: '', sourceType: 'extension', version: '', title: '' } },
  };
}

/** 酒馆世界书条目的空骨架（sourceId/sourceType 等由宿主按 sourceMeta 盖章） */
function blankEntry() {
  return {
    name: '',
    enabled: true,
    strategy: { type: 'selective', keys: [], keys_secondary: { logic: 'and_any', keys: [] }, scan_depth: 'same_as_global' },
    position: { type: 'after_character_definition', role: 'system', depth: 0, order: 100 },
    content: '',
    probability: 100,
    recursion: { prevent_incoming: false, prevent_outgoing: false, delay_until: null },
    effect: { sticky: null, cooldown: null, delay: null },
    extra: { wxhlWorkshop: { sourceId: '', sourceType: '', version: '', title: '' } },
  };
}

/** 五个并列分类的显示名——与包契约 pack/manifest.ts 的 PACK_TYPE_LABEL 一一对应 */
export const PACK_TYPE_LABEL = { dungeon: '副本', event: '事件', mechanism: '机制拓展', build: '构筑', persona: '人设' };

// ==================== 渲染模板（构筑/人设/副本 → 条目正文） ====================
function renderSkills(技能表) {
  const lines = Object.entries(技能表 ?? {}).map(([名, s]) => {
    const 效果 = Object.entries(s.效果 ?? {})
      .map(([k, v]) => \`\${k}：\${typeof v === 'string' ? v : JSON.stringify(v)}\`)
      .join('；');
    return \`· \${名}（\${s.类型 ?? '主动'}\${s.消耗 ? \`，消耗 \${s.消耗}\` : ''}\${s.冷却 ? \`，冷却 \${s.冷却}\` : ''}）\${效果 ? \`：\${效果}\` : ''}\`;
  });
  return lines.length ? lines.join('\\n') : '无';
}

function renderEffects(效果) {
  const parts = Object.entries(效果 ?? {}).map(([k, v]) => \`\${k}：\${v}\`);
  return parts.length ? \`—— \${parts.join('；')}\` : '';
}

function renderEquipment(装备) {
  return (
    Object.entries(装备 ?? {})
      .map(([槽, e]) => (e && e.名称 && e.名称 !== '无' ? \`· \${槽}：\${e.名称}（\${e.品质 ?? '无'}·\${e.阶位 ?? '无'}\${e.伤害骰 && e.伤害骰 !== '无' ? \`，伤害骰 \${e.伤害骰}\` : ''}\${e.倍率 ? \`，倍率 \${e.倍率}\` : ''}\${e.主属性加成 ? \`，主属性+\${e.主属性加成}\` : ''}）\` : null))
      .filter(Boolean)
      .join('\\n') || '无'
  );
}

/** 构筑：只印属性分配方向（不给具体数值），技能/装备沿用一期排版 */
export function renderBuildEntry(build) {
  const 方向 = build.属性分配方向 ?? {};
  return [
    \`【构筑】\${build.构筑名}\`,
    \`定位：\${build.定位}\`,
    \`属性分配方向：主 \${方向.主属性 ?? '无'} / 副 \${方向.副属性 ?? '无'}\`,
    build.天赋?.名称 && build.天赋.名称 !== '无' ? \`天赋：\${build.天赋.名称}（\${build.天赋.品质 ?? ''}）\${renderEffects(build.天赋.效果)}\` : null,
    build.血统?.名称 && build.血统.名称 !== '无' ? \`血统：\${build.血统.名称}（\${build.血统.品质 ?? ''}）\${renderEffects(build.血统.效果)}\` : null,
    build.称号?.名称 && build.称号.名称 !== '无' ? \`称号：\${build.称号.名称}\${renderEffects(build.称号.效果)}\` : null,
    build.职业?.名称 && build.职业.名称 !== '无' ? \`职业：\${build.职业.名称}（\${build.职业.稀有度 ?? ''}）\` : null,
    \`通用技能：\\n\${renderSkills(build.通用技能)}\`,
    \`主要装备：\\n\${renderEquipment(build.主要装备)}\`,
    Object.keys(build.背包建议 ?? {}).length
      ? \`背包建议：\\n\${Object.entries(build.背包建议).map(([名, it]) => \`· \${名} ×\${it.数量 ?? 1}\${it.描述 ? \`：\${it.描述}\` : ''}\`).join('\\n')}\`
      : null,
  ]
    .filter(Boolean)
    .join('\\n');
}

/** 人设：五要素 + 外观三件套 +（可选）构筑方向或嵌构筑 */
export function renderPersonaEntry(persona) {
  const 外观 = persona.外观 ?? {};
  const 外观行 = [
    外观.外貌 ? \`外貌：\${外观.外貌}\` : null,
    外观.衣着 ? \`衣着：\${外观.衣着}\` : null,
    外观.装备幻化 ? \`装备幻化：\${外观.装备幻化}\` : null,
  ].filter(Boolean);
  return [
    \`【人设】\${persona.角色名}\`,
    persona.性格 ? \`性格：\${persona.性格}\` : null,
    persona.爱好?.length ? \`爱好：\${persona.爱好.join('、')}\` : null,
    persona.厌恶?.length ? \`厌恶：\${persona.厌恶.join('、')}\` : null,
    \`背景故事：\\n\${persona.背景故事}\`,
    外观行.length ? \`外观：\\n\${外观行.join('\\n')}\` : null,
    persona.构筑方向 ? \`构筑方向：\${persona.构筑方向}\` : null,
    persona.构筑 ? \`构筑详情：\\n\${renderBuildEntry(persona.构筑)}\` : null,
  ]
    .filter(Boolean)
    .join('\\n');
}

function renderDungeonTask(任务) {
  return \`· \${任务?.名称 ?? ''}\${任务?.说明 ? \`：\${任务.说明}\` : ''}\${任务?.奖励 ? \`（奖励：\${任务.奖励}）\` : ''}\`;
}

function renderDungeonAchievement(成就) {
  return \`· \${成就?.名称 ?? ''}\${成就?.难度 ? \`（\${成就.难度}）\` : ''}\${成就?.说明 ? \`：\${成就.说明}\` : ''}\${成就?.奖励 ? \`（奖励：\${成就.奖励}）\` : ''}\`;
}

/** 副本：按 spec 4.1 字段排版，末节「GM 指导」 */
export function renderDungeonEntry(dungeon) {
  return [
    \`【副本】\${dungeon.副本名称}\`,
    \`类型：\${dungeon.副本类型}\\u3000基准等级：\${dungeon.基准等级}\\u3000时间限制：\${dungeon.时间限制}\`,
    \`背景设定：\\n\${dungeon.背景设定}\`,
    \`地图与区域：\\n\${dungeon.地图与区域}\`,
    \`敌人配置：\\n\${dungeon.敌人配置}\`,
    \`主线任务：\\n\${renderDungeonTask(dungeon.主线任务)}\`,
    dungeon.支线任务?.length ? \`支线任务：\\n\${dungeon.支线任务.map(renderDungeonTask).join('\\n')}\` : null,
    dungeon.世界事件?.length ? \`世界事件：\\n\${dungeon.世界事件.map(renderDungeonTask).join('\\n')}\` : null,
    dungeon.隐藏任务?.length ? \`隐藏任务：\\n\${dungeon.隐藏任务.map(renderDungeonTask).join('\\n')}\` : null,
    dungeon.成就?.length ? \`成就：\\n\${dungeon.成就.map(renderDungeonAchievement).join('\\n')}\` : null,
    \`GM 指导：\\n\${dungeon.GM指导}\`,
  ]
    .filter(Boolean)
    .join('\\n');
}

// ==================== 封面回退 ====================
// 深色底 + 🧩 的内联 SVG 占位图（URL 编码进 data: URI，绝不出破图）
export const COVER_PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240">' +
      '<rect width="400" height="240" fill="#1f2430"/>' +
      '<text x="200" y="128" font-size="72" text-anchor="middle" dominant-baseline="central">🧩</text>' +
      '</svg>',
  );

/** 干净的 http(s) 封面链接原样返回；空串/非法（含 javascript:）回退内置占位图 */
export function coverOrPlaceholder(cover) {
  return typeof cover === 'string' && /^https?:\\/\\/[^\\s"'<>\\\\]+$/.test(cover) ? cover : COVER_PLACEHOLDER;
}

// ==================== 包 → 条目 ====================
export function sourceMetaOf(pack) {
  return { sourceId: pack.id, sourceType: pack.type, version: pack.version, title: pack.name };
}

export function packToWorldbookEntries(pack) {
  const label = PACK_TYPE_LABEL[pack.type] ?? '内容';
  const prefix = entry => \`[回廊mod][\${label}]\${pack.name}·\${entry.name}\`;
  if (pack.type === 'mechanism') {
    return (pack.条目 ?? []).map(e => ({ ...mapExtensionEntry(e), name: prefix(e) }));
  }
  if (pack.type === 'event') {
    const list = (pack.事件条目 ?? []).map(e => ({ ...mapExtensionEntry(e), name: e.name })); // 事件名保持原样（控制器按名取）
    if (pack.控制器条目) {
      list.push({ ...blankEntry(), name: pack.控制器条目.名称, content: pack.控制器条目.正文, strategy: { type: 'constant', keys: [], keys_secondary: { logic: 'and_any', keys: [] }, scan_depth: 'same_as_global' } });
    }
    return list;
  }
  if (pack.type === 'dungeon') {
    const list = [
      {
        ...blankEntry(),
        name: \`[回廊mod][副本]\${pack.name}\`,
        strategy: { type: 'selective', keys: [pack.副本名称], keys_secondary: { logic: 'and_any', keys: [] }, scan_depth: 'same_as_global' },
        content: renderDungeonEntry(pack),
      },
    ];
    for (const e of pack.额外条目 ?? []) list.push({ ...mapExtensionEntry(e), name: prefix(e) });
    return list;
  }
  const payload = pack.type === 'build' ? pack.build : pack.persona;
  const keys = pack.type === 'build' ? [payload.构筑名] : [payload.角色名];
  return [
    {
      ...blankEntry(),
      name: \`[回廊mod][\${label}]\${pack.name}\`,
      strategy: { type: 'selective', keys, keys_secondary: { logic: 'and_any', keys: [] }, scan_depth: 'same_as_global' },
      content: pack.type === 'build' ? renderBuildEntry(payload) : renderPersonaEntry(payload),
    },
  ];
}

// ==================== 已装状态 ====================
export function computeInstalled(entries) {
  const map = new Map();
  for (const entry of entries ?? []) {
    const meta = entry?.extra?.wxhlWorkshop;
    if (!meta?.sourceId) continue;
    const prev = map.get(meta.sourceId) ?? { version: meta.version ?? '', count: 0 };
    map.set(meta.sourceId, { version: meta.version ?? prev.version, count: prev.count + 1 });
  }
  return map;
}

// ==================== API 封装 ====================
async function callApi(path, options) {
  const res = await fetch(path, options);
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* 非 JSON 响应 */
  }
  if (!res.ok) {
    const error = new Error(data?.error || \`请求失败（HTTP \${res.status}）\`);
    // 带上状态码：页面靠它区分「密钥不对（403）」与网络故障——403 才清掉记住的密钥
    error.status = res.status;
    throw error;
  }
  return data;
}

const jsonPost = body => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export const api = {
  list: params => callApi(\`/api/packs?\${new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v))}\`),
  get: id => callApi(\`/api/packs/\${id}\`),
  upload: pack => callApi('/api/packs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pack) }),
  update: (id, manageKey, pack) =>
    callApi(\`/api/packs/\${id}\`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ manageKey, pack }) }),
  remove: (id, manageKey) =>
    callApi(\`/api/packs/\${id}\`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ manageKey }) }),
  // 管理端点：纯 HTTP，键在请求体里；密钥不对时服务端回 403
  adminList: key => callApi('/api/admin/list', jsonPost({ key })),
  adminDelete: (key, ids) => callApi('/api/admin/delete', jsonPost({ key, ids })),
  adminResetKey: (key, id) => callApi('/api/admin/reset-key', jsonPost({ key, id })),
};

// ==================== 免责声明 ====================
export function isAgreementAccepted(storage) {
  try {
    return storage.getItem(AGREEMENT_KEY) === '1';
  } catch {
    return false;
  }
}

export function acceptAgreement(storage) {
  try {
    storage.setItem(AGREEMENT_KEY, '1');
  } catch {
    /* 隐私模式下写不进就算了——下次再弹一次 */
  }
}

// ==================== 世界书 JSON 导入（移植自用户提供补丁 worldbook-json-import.mjs） ====================
// 纯转换：绝不执行世界书内容，也绝不碰 DOM。整次拒绝——任一条目有工坊不支持的设置，
// 整次导入抛错并点名，绝不静默跳过单条或偷偷改设置。
export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
export const MAX_IMPORT_ENTRIES = 2000;

const IMPORT_POSITIONS = new Map([[0, 'before_char'], [1, 'after_char'], [4, 'at_depth']]);
const KNOWN_WORLDBOOK_FIELDS = new Set([
  'uid', 'displayIndex', 'comment', 'name', 'content', 'key', 'keysecondary',
  'constant', 'disable', 'selective', 'selectiveLogic', 'position', 'role',
  'depth', 'order', 'probability', 'useProbability', 'sticky', 'cooldown', 'delay',
  'preventRecursion', 'excludeRecursion', 'vectorized', 'ignoreBudget',
  'matchPersonaDescription', 'matchCharacterDescription', 'matchCharacterPersonality',
  'matchCharacterDepthPrompt', 'matchScenario', 'matchCreatorNotes',
  'delayUntilRecursion', 'outletName', 'group', 'groupOverride', 'groupWeight',
  'scanDepth', 'caseSensitive', 'matchWholeWords', 'useGroupScoring', 'automationId',
  'characterFilterNames', 'characterFilterTags', 'characterFilterExclude',
  'triggers', 'addMemo', 'extensions', 'characterFilter',
]);
const UNSUPPORTED_NONEMPTY_FIELDS = [
  'vectorized', 'ignoreBudget', 'matchPersonaDescription', 'matchCharacterDescription',
  'matchCharacterPersonality', 'matchCharacterDepthPrompt', 'matchScenario', 'matchCreatorNotes',
  'delayUntilRecursion', 'outletName', 'group', 'automationId', 'characterFilterNames',
  'characterFilterTags', 'characterFilterExclude', 'triggers', 'extensions', 'characterFilter',
];
const UNSUPPORTED_IF_PRESENT = ['scanDepth', 'caseSensitive', 'matchWholeWords'];
const GLOBAL_UNSUPPORTED = ['scan_depth', 'token_budget', 'recursive_scanning', 'extensions'];

const isPlainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

function hasData(value) {
  if (value === undefined || value === null || value === false || value === 0 || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (isPlainObject(value)) return Object.keys(value).length > 0;
  return true;
}

function importBool(entry, field, fallback) {
  if (!hasOwn(entry, field)) return fallback;
  if (typeof entry[field] !== 'boolean') throw new Error(\`\${field} 必须是布尔值\`);
  return entry[field];
}

function importNumber(entry, field, fallback, { integer = true, min = -Infinity, max = Infinity } = {}) {
  if (!hasOwn(entry, field)) return fallback;
  const value = entry[field];
  if (typeof value !== 'number' || !Number.isFinite(value) || (integer && !Number.isInteger(value)) || value < min || value > max) {
    throw new Error(\`\${field} 的数值不合法\`);
  }
  return value;
}

function importNullableNumber(entry, field) {
  if (entry[field] === undefined || entry[field] === null) return null;
  return importNumber(entry, field, null, { min: 0 });
}

function importKeywords(entry, field) {
  if (!hasOwn(entry, field)) return [];
  if (!Array.isArray(entry[field]) || entry[field].some(word => typeof word !== 'string' || word.length === 0)) {
    throw new Error(\`\${field} 必须是非空字符串组成的数组\`);
  }
  return [...entry[field]];
}

function checkUnsupportedSettings(entry, constant, secondaryKeys, position) {
  const unsupported = [];
  for (const field of UNSUPPORTED_NONEMPTY_FIELDS) {
    if (hasData(entry[field])) unsupported.push(field);
  }
  // 显式给出的逐条覆盖值不同于继承宿主全局设置（包括 false 与 0）：当前包无对应字段。
  for (const field of UNSUPPORTED_IF_PRESENT) {
    if (entry[field] !== undefined && entry[field] !== null) unsupported.push(field);
  }
  if (!constant && secondaryKeys.length > 0 && importBool(entry, 'selective', true) && (entry.selectiveLogic ?? 0) !== 0) {
    unsupported.push('selectiveLogic（工坊仅支持 AND ANY）');
  }
  if (position === 4 && (entry.role ?? 0) !== 0) unsupported.push('role（工坊仅支持 system）');
  for (const key of Object.keys(entry)) if (!KNOWN_WORLDBOOK_FIELDS.has(key)) unsupported.push(key);
  if (unsupported.length) throw new Error('当前工坊不能保留这些设置：' + unsupported.join('、'));
}

function convertWorldbookEntry(entry, index) {
  if (!isPlainObject(entry)) throw new Error('条目必须是对象');
  if (typeof entry.content !== 'string' || entry.content.length === 0) throw new Error('正文为空或不是字符串');
  if (!['key', 'comment', 'uid', 'disable'].some(key => hasOwn(entry, key))) {
    throw new Error('不是酒馆原生世界书条目；请在酒馆的世界书管理中导出 JSON');
  }
  const keys = importKeywords(entry, 'key');
  const secondary = importKeywords(entry, 'keysecondary');
  const constant = importBool(entry, 'constant', false);
  const position = importNumber(entry, 'position', 0);
  if (!IMPORT_POSITIONS.has(position)) throw new Error(\`插入位置 \${position} 暂不受工坊支持（仅支持角色定义前、后和指定深度）\`);
  checkUnsupportedSettings(entry, constant, secondary, position);
  if (!constant && keys.length === 0) throw new Error('绿灯条目没有主关键词，当前工坊服务器不接受此格式（禁用条目也一样）');
  if (entry.comment !== undefined && typeof entry.comment !== 'string') throw new Error('comment 必须是字符串');
  if (entry.name !== undefined && typeof entry.name !== 'string') throw new Error('name 必须是字符串');
  const sourceName = (entry.comment || entry.name || '').trim();
  const name = sourceName || \`条目 \${index + 1}\`;
  return {
    generatedName: !sourceName,
    entry: {
      name,
      // 正文（含 EJS/HTML 与换行）逐字以字符串保留。
      content: entry.content,
      enabled: !importBool(entry, 'disable', false),
      constant,
      keys,
      // selective 为 false 时，未使用的次要关键词不影响原作。
      keysSecondary: importBool(entry, 'selective', true) ? secondary : [],
      position: IMPORT_POSITIONS.get(position),
      depth: importNumber(entry, 'depth', 4, { min: 0 }),
      order: importNumber(entry, 'order', 100),
      probability: importBool(entry, 'useProbability', true) ? importNumber(entry, 'probability', 100, { integer: false, min: 0, max: 100 }) : 100,
      preventRecursion: importBool(entry, 'preventRecursion', false),
      excludeRecursion: importBool(entry, 'excludeRecursion', false),
      sticky: importNullableNumber(entry, 'sticky'),
      cooldown: importNullableNumber(entry, 'cooldown'),
      delay: importNullableNumber(entry, 'delay'),
    },
  };
}

export function parseWorldbookJson(text, filename = '世界书.json') {
  if (typeof text !== 'string') throw new Error('无法读取文件文本');
  if (new TextEncoder().encode(text).byteLength > MAX_IMPORT_BYTES) throw new Error('文件过大，请使用 10 MB 以内的世界书 JSON');
  let book;
  try { book = JSON.parse(text.replace(/^\\uFEFF/, '')); }
  catch { throw new Error('JSON 格式不正确，请选择从酒馆导出的世界书文件'); }
  if (!isPlainObject(book) || (!isPlainObject(book.entries) && !Array.isArray(book.entries))) {
    throw new Error('未找到 entries；请选择世界书 JSON，角色卡或酒馆脚本 JSON 不适用');
  }
  for (const field of GLOBAL_UNSUPPORTED) {
    if (hasData(book[field])) throw new Error(\`世界书全局设置 \${field} 暂不能由当前工坊保留\`);
  }
  const rawEntries = Object.values(book.entries);
  if (!rawEntries.length) throw new Error('世界书没有条目');
  if (rawEntries.length > MAX_IMPORT_ENTRIES) throw new Error(\`条目过多，单次最多导入 \${MAX_IMPORT_ENTRIES} 条\`);
  const entries = [], errors = [];
  let generatedNames = 0;
  for (const [index, raw] of rawEntries.entries()) {
    try {
      const converted = convertWorldbookEntry(raw, index);
      entries.push(converted.entry);
      generatedNames += Number(converted.generatedName);
    } catch (error) {
      const title = typeof raw?.comment === 'string' && raw.comment.trim() ? raw.comment.trim() : \`条目 \${index + 1}\`;
      errors.push(\`\${title}：\${error.message}\`);
    }
  }
  if (errors.length) {
    throw new Error(\`尚未导入，原草稿已保留。有 \${errors.length} 条条目需要处理：\\n\` + errors.slice(0, 10).join('\\n') + (errors.length > 10 ? '\\n（仅显示前 10 条）' : ''));
  }
  return {
    name: (typeof book.name === 'string' && book.name.trim()) || filename.replace(/\\.json$/i, ''),
    entries,
    summary: { total: entries.length, disabled: entries.filter(entry => !entry.enabled).length, generatedNames },
  };
}

// ==================== 构筑：粘贴变量捕捉 + 属性方向推导（spec §10.5） ====================
const ATTR_ORDER = ['STR', 'AGI', 'CON', 'PER'];

/** 由四维数值推导主/副属性（最大为主、次大为副；并列按 STR>AGI>CON>PER；缺值回 STR/无） */
export function deriveAttributeDirection(属性基础) {
  if (!属性基础) return { 主属性: 'STR', 副属性: '无' };
  const 排序 = [...ATTR_ORDER].sort((a, b) => {
    const diff = (Number(属性基础[b]) || 0) - (Number(属性基础[a]) || 0);
    return diff !== 0 ? diff : ATTR_ORDER.indexOf(a) - ATTR_ORDER.indexOf(b);
  });
  return { 主属性: 排序[0], 副属性: 排序[1] ?? '无' };
}

/** 契约者/实体身上已知的字段名——用来「认字」而不是枚举形状 */
const CONTRACTOR_KEYS = ['头部', '属性', '衍生属性', '职业', '通用技能', '装备', '特殊资源', '状态', '背包', '外貌', '构筑', '好感度'];

const ATTR_KEYS = ['STR', 'AGI', 'CON', 'PER'];

/** 四维：从数组/对象里捡出 STR/AGI/CON/PER（缺的补 5） */
function pickAttributes(node) {
  const 候选 = [node?.属性?.基础, node?.属性, node?.属性基础, node];
  for (const c of 候选) {
    if (isRecord(c) && ATTR_KEYS.some(k => k in c)) {
      return Object.fromEntries(ATTR_KEYS.map(k => [k, Number(c[k]) || 5]));
    }
  }
  return null;
}

const isRecord = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const looksLikeBuild = v => isRecord(v) && ('构筑名' in v || '定位' in v);

/** 按字段名到各处捡出构筑载荷（不假设层级：等级/阶位在顶上或 头部 下都行，四维同理） */
function buildFromAnywhere(source, nameHint = '') {
  const 头部 = isRecord(source.头部) ? source.头部 : source;
  const 职业 = isRecord(source.职业) ? source.职业 : {};
  const 称号 = (头部.称号 && (头部.称号.当前称号 ?? 头部.称号)) || source.称号 || {};
  const 属性基础 = pickAttributes(source) ?? { STR: 5, AGI: 5, CON: 5, PER: 5 };
  const 名字 =
    nameHint ||
    (头部.姓名 && String(头部.姓名).trim()) ||
    (职业.名称 && 职业.名称 !== '无' ? 职业.名称 : '') ||
    '未命名构筑';
  const 通用技能 = source.通用技能 ?? source.技能 ?? {};
  const 装备 = source.装备 ?? source.主要装备 ?? {};
  return {
    构筑名: 名字,
    定位:
      source.构筑 && source.构筑 !== '无'
        ? source.构筑
        : 职业.职业简介 && 职业.职业简介 !== '无'
          ? 职业.职业简介
          : '未填写',
    等级: Number(头部.等级 ?? source.等级) || 1,
    阶位: 头部.阶位 ?? source.阶位 ?? '一阶',
    属性基础,
    属性分配方向: deriveAttributeDirection(属性基础),
    天赋: 头部.天赋 ?? source.天赋 ?? {},
    血统: 头部.血统 ?? source.血统 ?? {},
    称号,
    职业,
    通用技能,
    主要装备: 装备,
    背包建议: {},
  };
}

/** 「认字」打分：这棵子树里有几个已知契约者字段 */
function contractorScore(node) {
  if (!isRecord(node)) return 0;
  // 已知键名 + 四维（平铺形态常常只有四维与职业，光数键名会误判成「信息太少」）
  return CONTRACTOR_KEYS.filter(k => k in node).length + (pickAttributes(node) ? 2 : 0);
}

/** 深度优先找最像契约者/实体的子树（字段最多者胜） */
function pickRichest(root) {
  let best = null;
  const walk = (node, depth, keyHint) => {
    if (depth > 6) return;
    if (Array.isArray(node)) {
      node.forEach(v => walk(v, depth + 1, keyHint));
      return;
    }
    if (!isRecord(node)) return;
    const score = contractorScore(node);
    // 注意：外层键名（如 契约者 / stat_data）是容器名，不能当实体名用
    if (score > 0 && (!best || score > best.score)) best = { node, score };
    for (const [k, v] of Object.entries(node)) {
      if (isRecord(v) || Array.isArray(v)) walk(v, depth + 1, k);
    }
  };
  walk(root, 0, '');
  return best;
}

/**
 * 按 path 回放 MVU 指令，拼出一个对象（用于逐字段 replace 那种复制形态）。
 * path 形如 '/契约者/头部/姓名'；支持 replace/insert/set/assign/add 与 delete/remove。
 */
export function applyMvuCommands(raw) {
  const root = {};
  const keysOf = p => String(p ?? '').split('/').slice(1).filter(k => k !== '');
  const parentOf = keys => {
    let node = root;
    for (const k of keys) {
      if (!isRecord(node[k])) node[k] = {};
      node = node[k];
    }
    return node;
  };
  for (const item of Array.isArray(raw) ? raw : []) {
    if (!isRecord(item)) continue;
    const keys = keysOf(item.path);
    if (keys.length === 0) continue;
    const op = String(item.op ?? 'replace').toLowerCase();
    if (op === 'delete' || op === 'remove' || op === 'unset') {
      const parent = keys.length === 1 ? root : parentOf(keys.slice(0, -1));
      delete parent[keys[keys.length - 1]];
      continue;
    }
    const parent = keys.length === 1 ? root : parentOf(keys.slice(0, -1));
    parent[keys[keys.length - 1]] = item.value;
  }
  return root;
}

/**
 * 粘贴 JSON 捕捉构筑。**按字段名识别，不枚举形状**：
 *   指令数组（逐字段 replace / 一条 insert 整个实体）→ 先回放成对象；
 *   然后整棵走一遍，谁凑出的已知字段（头部/属性/职业/通用技能/装备…）最多就用谁，
 *   再按字段名到各处捡值（等级/阶位在顶上或 头部 下都行，四维在 属性.基础 或平铺都行）。
 * 一点都认不出来就抛人话错误（不静默产出空构筑）。
 */
export function parseBuildJson(text) {
  let raw;
  try {
    raw = JSON.parse(String(text ?? '').replace(/^\\uFEFF/, ''));
  } catch {
    throw new Error('JSON 格式不正确：请粘贴从酒馆复制的变量或一份构筑载荷');
  }

  const 是指令数组 = Array.isArray(raw);
  const 源 = 是指令数组 ? applyMvuCommands(raw) : raw;

  // 直接是一份构筑载荷 → 原样采用
  if (looksLikeBuild(源)) return 源;

  const 指令 = 是指令数组 ? raw.filter(item => isRecord(item) && isRecord(item.value)) : [];
  const 最后一条 = 指令[指令.length - 1];
  const 路径名 = 最后一条 ? (String(最后一条.path ?? '').split('/').filter(Boolean).pop() ?? '') : '';

  // 认字：整棵找最像契约者/实体的子树（stat_data.契约者 / {契约者} / 裸子树 / 更深包装都能命中）
  const 命中 = pickRichest(源);
  if (命中 && 命中.score >= 2) {
    // 命中的正是「某条指令塞进来的整个实体」时，用 path 末段当名字（对副本角色/队友，这比职业名贴切）
    const 提示 = 最后一条 && 最后一条.value === 命中.node ? 路径名 : '';
    return buildFromAnywhere(命中.node, 提示);
  }

  if (指令.length === 0 && Object.keys(源).length === 0) {
    throw new Error('无法识别的 JSON：指令数组里没有可用的 value（需要 op/path/value 形式）');
  }
  if (最后一条 && contractorScore(最后一条.value) >= 2) {
    return buildFromAnywhere(最后一条.value, 路径名);
  }
  if (命中 && 命中.score === 1) {
    throw new Error('这段 JSON 里只认出 1 个构筑字段，信息太少，无法确定是契约者（请从酒馆复制完整的变量结构）');
  }
  throw new Error('无法识别的 JSON：没找到 头部/属性/职业/通用技能/装备 等构筑字段（指令数组或契约者变量都行）');
}
`;var Ul=null;function Xm(e){return e.replace(/[\\%_]/g,n=>`\\${n}`)}async function t$(e){await e.prepare(`CREATE TABLE IF NOT EXISTS packs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        version TEXT NOT NULL,
        author_name TEXT NOT NULL,
        author_discord TEXT NOT NULL DEFAULT '',
        tags_json TEXT NOT NULL DEFAULT '[]',
        description TEXT NOT NULL DEFAULT '',
        pack_json TEXT NOT NULL,
        manage_hash TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'published',
        downloads INTEGER NOT NULL DEFAULT 0,
        entry_count INTEGER NOT NULL DEFAULT 0,
        cover TEXT NOT NULL DEFAULT '',
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      )`).run();try{await e.prepare("ALTER TABLE packs ADD COLUMN cover TEXT NOT NULL DEFAULT ''").run()}catch(n){if(!(n instanceof Error&&n.message.includes("duplicate column")))throw console.warn("[wxhl工坊] cover 列迁移失败：",n),n}await e.prepare("CREATE INDEX IF NOT EXISTS idx_packs_type ON packs(type)").run(),await e.prepare("CREATE INDEX IF NOT EXISTS idx_packs_updated ON packs(updated DESC)").run()}async function n$(e,n){await e.prepare(`INSERT INTO packs (id, name, type, version, author_name, author_discord, tags_json, description, pack_json, manage_hash, status, downloads, entry_count, cover, created, updated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', 0, ?, ?, ?, ?)`).bind(n.id,n.name,n.type,n.version,n.author_name,n.author_discord,n.tags_json,n.description,n.pack_json,n.manage_hash,n.entry_count,n.cover,n.created,n.updated).run()}async function Wn(e,n){return await e.prepare("SELECT * FROM packs WHERE id = ?").bind(n).first()}async function qm(e,n){let i=["status = 'published'"],o=[];if(n.type&&(i.push("type = ?"),o.push(n.type)),n.q){let u=`%${Xm(n.q)}%`;i.push("(name LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\' OR author_name LIKE ? ESCAPE '\\')"),o.push(u,u,u)}n.tag&&(i.push("tags_json LIKE ? ESCAPE '\\'"),o.push(`%"${Xm(n.tag)}"%`));let t=i.join(" AND "),r=n.sort==="downloads"?"ORDER BY downloads DESC":"ORDER BY updated DESC",a=await e.prepare(`SELECT COUNT(*) AS total FROM packs WHERE ${t}`).bind(...o).first();return{rows:(await e.prepare(`SELECT id, name, type, version, author_name, tags_json, description, downloads, entry_count, cover, updated FROM packs WHERE ${t} ${r} LIMIT ? OFFSET ?`).bind(...o,n.limit,n.offset).all()).results??[],total:a?.total??0}}async function r$(e,n,i,o){let t=await Wn(e,n);if(!t||t.manage_hash!==i)return!1;let r={...t,...o};return((await e.prepare("UPDATE packs SET name = ?, type = ?, version = ?, author_name = ?, author_discord = ?, tags_json = ?, description = ?, pack_json = ?, entry_count = ?, cover = ?, updated = ? WHERE id = ? AND manage_hash = ?").bind(r.name,r.type,r.version,r.author_name,r.author_discord,r.tags_json,r.description,r.pack_json,r.entry_count,r.cover,r.updated,n,i).run()).meta?.changes??0)>0}async function i$(e,n,i){return((await e.prepare("DELETE FROM packs WHERE id = ? AND manage_hash = ?").bind(n,i).run()).meta?.changes??0)>0}async function o$(e,n){return((await e.prepare("DELETE FROM packs WHERE id = ?").bind(n).run()).meta?.changes??0)>0}async function a$(e,n,i){return((await e.prepare("UPDATE packs SET manage_hash = ?, updated = ? WHERE id = ?").bind(i,new Date().toISOString(),n).run()).meta?.changes??0)>0}async function c$(e,n){await e.prepare("UPDATE packs SET downloads = downloads + 1 WHERE id = ?").bind(n).run()}var Hm=256*1024,Ym=100,ro=100;function Qm(){let e="0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",n=crypto.getRandomValues(new Uint8Array(8));return Array.from(n,i=>e[i%e.length]).join("")}async function no(e){let n=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(e));return Array.from(new Uint8Array(n),i=>i.toString(16).padStart(2,"0")).join("")}function ze(e,n=200){return new Response(JSON.stringify(e),{status:n,headers:{"Content-Type":"application/json; charset=utf-8"}})}function F(e,n){return ze({error:e},n)}function eg(e){let n=Km.safeParse(e);if(!n.success)return{ok:!1,error:`包格式不符合规范：${d.prettifyError(n.error)}`};let i=n.data;return i.name.length>Ym?{ok:!1,error:`名称过长（上限 ${Ym} 字符）`}:s$(i)?{ok:!1,error:`条目数过多（上限 ${ro} 条）`}:{ok:!0,pack:i}}function u$(e){return e.type==="mechanism"?e.条目.length:e.type==="event"?e.事件条目.length+(e.控制器条目?1:0):e.type==="dungeon"?1+(e.额外条目?.length??0):1}function s$(e){return e.type==="mechanism"?e.条目.length>ro:e.type==="event"?e.事件条目.length>ro:e.type==="dungeon"?(e.额外条目?.length??0)>ro:!1}function tg(e,n,i,o,t){return{id:n,name:e.name,type:e.type,version:e.version,author_name:e.author.name,author_discord:e.author.discord??"",tags_json:JSON.stringify(e.tags??[]),description:e.description??"",pack_json:JSON.stringify(e),manage_hash:i,status:"published",downloads:t?.downloads??0,entry_count:u$(e),cover:e.cover??"",created:t?.created??o,updated:o}}function ng(e){return{id:e.id,name:e.name,type:e.type,typeLabel:jl[e.type]??"内容",version:e.version,authorName:e.author_name,tags:JSON.parse(e.tags_json||"[]"),description:e.description,cover:e.cover??"",downloads:e.downloads,entryCount:e.entry_count,updated:e.updated}}var Vw={async fetch(e,n){let i=new URL(e.url);try{if(i.pathname==="/"&&e.method==="GET")return new Response(Wm,{headers:{"Content-Type":"text/html; charset=utf-8"}});if(i.pathname==="/page-lib.js"&&e.method==="GET")return new Response(Gm,{headers:{"Content-Type":"application/javascript; charset=utf-8"}});Ul??=t$(n.WORKSHOP_DB).catch(r=>{throw Ul=null,r}),await Ul;let o=n.WORKSHOP_DB;if(i.pathname.startsWith("/api/admin/")){if(e.method!=="POST")return F("管理端点只接受 POST",405);let r;try{r=await e.json()}catch{return F("请求体不是合法 JSON",400)}let a=n.WORKSHOP_ADMIN_KEY;if(!a||r?.key!==a)return F("管理密钥不正确或未配置",403);if(i.pathname==="/api/admin/list"){let{rows:c,total:u}=await qm(o,{limit:200,offset:0});return ze({total:u,rows:c.map(ng)})}if(i.pathname==="/api/admin/delete"){let c=Array.isArray(r.ids)?r.ids.filter(s=>typeof s=="string"):[];if(c.length===0)return F("缺少 ids",400);let u=0;for(let s of c)await o$(o,s)&&u++;return ze({ok:!0,deleted:u})}if(i.pathname==="/api/admin/reset-key"){if(typeof r.id!="string"||!r.id)return F("缺少 id",400);let c=crypto.randomUUID().replaceAll("-",""),u=await no(c);return await a$(o,r.id,u)?ze({ok:!0,id:r.id,manageKey:c}):F("内容包不存在",404)}return F("没有这个管理端点",404)}if(i.pathname==="/api/packs"&&e.method==="GET"){let r=Math.min(Math.max(Number(i.searchParams.get("limit"))||20,1),50),a=Math.max(Number(i.searchParams.get("offset"))||0,0),c=i.searchParams.get("sort")==="downloads"?"downloads":"updated",{rows:u,total:s}=await qm(o,{q:i.searchParams.get("q")??void 0,type:i.searchParams.get("type")??void 0,tag:i.searchParams.get("tag")??void 0,sort:c,limit:r,offset:a});return ze({packs:u.map(ng),total:s})}let t=i.pathname.match(/^\/api\/packs\/([0-9a-zA-Z]{8})$/);if(t&&e.method==="GET"){let r=await Wn(o,t[1]);return!r||r.status!=="published"?F("内容包不存在或已下架",404):(await c$(o,r.id),ze({pack:JSON.parse(r.pack_json)}))}if(i.pathname==="/api/packs"&&e.method==="POST"){let r=await e.text();if(r.length>Hm)return F(`包体过大（上限 ${Hm/1024}KB）`,413);let a;try{a=JSON.parse(r)}catch{return F("请求体不是合法 JSON",400)}let c=eg(a);if(!c.ok)return F(c.error,422);if(c.pack.id=Qm(),await Wn(o,c.pack.id)&&(c.pack.id=Qm()),await Wn(o,c.pack.id))return F("服务繁忙，请重试",503);let u=crypto.randomUUID().replaceAll("-",""),s=await no(u);return await n$(o,tg(c.pack,c.pack.id,s,new Date().toISOString())),ze({id:c.pack.id,manageKey:u},201)}if(t&&e.method==="PUT"){let r;try{r=await e.json()}catch{return F("请求体不是合法 JSON",400)}if(typeof r?.manageKey!="string"||!r.manageKey)return F("缺少 manageKey",400);let a=eg(r.pack);if(!a.ok)return F(a.error,422);a.pack.id=t[1];let c=await no(r.manageKey),u=await Wn(o,t[1]);return!u||u.manage_hash!==c||!await r$(o,t[1],c,tg(a.pack,t[1],c,new Date().toISOString(),u))?F("内容包不存在或管理密钥不正确",403):ze({ok:!0,id:t[1]})}if(t&&e.method==="DELETE"){let r;try{r=await e.json()}catch{return F("请求体不是合法 JSON",400)}if(typeof r?.manageKey!="string"||!r.manageKey)return F("缺少 manageKey",400);let a=await no(r.manageKey);return await i$(o,t[1],a)?ze({ok:!0,id:t[1]}):F("内容包不存在或管理密钥不正确",403)}return F("没有这个接口",404)}catch(o){return console.error("[wxhl工坊] 未捕获异常:",o),F(o instanceof Error?`服务内部错误：${o.message}`:"服务内部错误",500)}}};export{c$ as bumpDownloads,Vw as default,o$ as deletePackById,i$ as deletePackByKey,t$ as ensureSchema,Qm as genPackId,Wn as getPackById,n$ as insertPack,Xm as likeEscape,qm as listPacks,a$ as resetManageKey,no as sha256Hex,r$ as updatePackByKey};
