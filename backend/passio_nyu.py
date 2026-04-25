import passiogo

# Find NYU's system ID (if not known, print all systems and search for NYU)
def get_nyu_system():
    # This will print all available systems in markdown format
    # so you can find the NYU system ID
    passiogo.printAllSystemsMd()
    # Once you know the NYU system ID, use it below
    # Example: system = passiogo.getSystemFromID(NYU_SYSTEM_ID)
    # return system

# Get all real-time routes for NYU
def get_nyu_routes(system_id):
    system = passiogo.getSystemFromID(system_id)
    routes = system.getRoutes()
    return routes

# Example usage (replace with NYU's actual system ID)
if __name__ == "__main__":
    # Uncomment the next line to print all systems and find NYU's ID
    # get_nyu_system()
    
    NYU_SYSTEM_ID = 1068  # Replace with NYU's actual system ID
    routes = get_nyu_routes(NYU_SYSTEM_ID)
    for route in routes:
        print(route.__dict__)
