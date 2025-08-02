Use react-hot-toast (already installed) for notifications/alerts. 
Replace most alerts with toasts. 
Provide good toast UX.

Website: https://react-hot-toast.com/

```tsx
import toast, { Toaster } from 'react-hot-toast';

const notify = () => toast('Here is your toast.');

const App = () => {
  return (
    <div>
      <button onClick={notify}>Make me a toast</button>
      <Toaster />
    </div>
  );
};
```

## [Available toast options](https://react-hot-toast.com/docs/toast#available-toast-options)

You can provide `ToastOptions` as the second argument. They will overwrite all options received from [`<Toaster/>`](https://react-hot-toast.com/docs/toaster).

```
toast('Hello World', {
```

duration: 4000,

position: 'top-center',

// Styling

style: {},

className: '',

// Custom Icon

icon: '👏',

// Change colors of success/error/loading icon

iconTheme: {

primary: '#000',

secondary: '#fff',

},

// Aria

ariaProps: {

role: 'status',

'aria-live': 'polite',

},

// Additional Configuration

removeDelay: 1000,

});

## [Creating a toast](https://react-hot-toast.com/docs/toast#creating-a-toast)

### [Blank](https://react-hot-toast.com/docs/toast#blank)

```
toast('Hello World');
```

The most basic variant. It does not have an icon by default, but you can provide one via the options. If you don't want any default styles, use `toast.custom()` instead.

### [Success](https://react-hot-toast.com/docs/toast#success)

```
toast.success('Successfully created!');
```

Creates a notification with an animated checkmark. It can be themed with the `iconTheme` option.

### [Error](https://react-hot-toast.com/docs/toast#error)

```
toast.error('This is an error!');
```

Creates a notification with an animated error icon. It can be themed with the `iconTheme` option.

### [Custom (JSX)](https://react-hot-toast.com/docs/toast#custom-jsx)

```
toast.custom(<div>Hello World</div>);
```

Creates a custom notification with JSX without default styles.

### [Loading](https://react-hot-toast.com/docs/toast#loading)

```
toast.loading('Waiting...');
```

This will create a loading notification. Most likely, you want to update it afterwards. For a friendly alternative, check out `toast.promise()`, which takes care of that automatically.

### [Promise](https://react-hot-toast.com/docs/toast#promise)

This shorthand is useful for mapping a promise to a toast. It will update automatically when the promise resolves or fails.

#### Simple Usage

```
const myPromise = fetchData();
```

toast.promise(myPromise, {

loading: 'Loading',

success: 'Got the data',

error: 'Error when fetching',

});

It's recommend to add min-width to your `toast.promise()` calls to **prevent jumps** from different message lengths.

#### Advanced

You can provide a function to the success/error messages to incorporate the result/error of the promise. The third argument are `toastOptions` similiar to [`<Toaster />`](https://react-hot-toast.com/docs/toaster)

```
toast.promise(
```

&#x20; myPromise,

{

loading: 'Loading',

success: (data) => \`Successfully saved ${data.name}\`,

error: (err) => \`This just happened: ${err.toString()}\`,

},

{

style: {

minWidth: '250px',

},

success: {

duration: 5000,

icon: '🔥',

},

}

);

#### Using an Async Function

You can also provide a function that returns a promise, which will be called automatically.

```
toast.promise(
```

async () => {

const { id } = await fetchData1();

await fetchData2(id);

},

{

loading: 'Loading',

success: 'Got the data',

error: 'Error when fetching',

}

);


