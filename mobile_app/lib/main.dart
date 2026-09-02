import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'screens/login_screen.dart';
import 'screens/customer_home_screen.dart';
import 'screens/technician_home_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  final prefs = await SharedPreferences.getInstance();
  final token = prefs.getString('token');
  final role = prefs.getString('role');

  Widget initialScreen = LoginScreen();

  if (token != null && role != null) {
    if (role == 'CUSTOMER') initialScreen = CustomerHomeScreen();
    if (role == 'TECHNICIAN') initialScreen = TechnicianHomeScreen();
  }

  runApp(FsmApp(initialScreen: initialScreen));
}

class FsmApp extends StatelessWidget {
  final Widget initialScreen;

  const FsmApp({Key? key, required this.initialScreen}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'FSM App',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: initialScreen,
      debugShowCheckedModeBanner: false,
    );
  }
}
