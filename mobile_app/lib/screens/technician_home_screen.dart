import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import 'login_screen.dart';

class TechnicianHomeScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Technician Jobs'),
        actions: [
          IconButton(
            icon: Icon(Icons.logout),
            onPressed: () async {
              await AuthService.logout();
              Navigator.pushReplacement(
                context, MaterialPageRoute(builder: (context) => LoginScreen())
              );
            },
          )
        ],
      ),
      body: Center(
        child: Text('Welcome, Tech! Job listings coming soon.'),
      ),
    );
  }
}
